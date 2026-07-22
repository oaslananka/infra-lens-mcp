import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { Client, type ConnectConfig } from 'ssh2';

import { createLogger } from './logging.js';
import type { ConnectionInput, RuntimeProfile } from './types.js';

const logger = createLogger('ssh');
const SHA256_FINGERPRINT_PREFIX = 'SHA256:';
const BASE64_PADDING_CHARACTER = '=';
let hasWarnedAboutPermissiveHostVerification = false;
const activeSessionsByHost = new Map<string, number>();
const attemptsByHost = new Map<string, { windowStart: number; count: number }>();

export interface CommandResult {
  stdout: string;
  stderr: string;
  code: number;
}

export interface SshSession {
  exec(command: string, timeoutMs?: number): Promise<CommandResult>;
  close(): void;
}

export interface SshExecStreamLike {
  stderr: {
    on(event: 'data', listener: (chunk: Buffer) => void): void;
  };
  on(event: 'data', listener: (chunk: Buffer) => void): this;
  on(event: 'close', listener: (code?: number) => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
  close(): void;
}

export interface SshClientLike {
  exec(
    command: string,
    callback: (error: Error | undefined, stream: SshExecStreamLike) => void
  ): void;
  once(event: 'ready', listener: () => void): this;
  once(event: 'error', listener: (error: Error) => void): this;
  removeListener(event: 'ready', listener: () => void): this;
  removeListener(event: 'error', listener: (error: Error) => void): this;
  connect(config: ConnectConfig): void;
  end(): void;
}

export interface InfraLensConnectConfig extends Omit<ConnectConfig, 'hostVerifier'> {
  hostVerifier?: (key: Buffer) => boolean;
}

interface KnownHostEntry {
  hosts: string[];
  keyType: string;
  key: Buffer;
}

function createAbortError(): Error {
  return Object.assign(new Error('SSH operation cancelled.'), { name: 'AbortError' });
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw createAbortError();
  }
}

class Ssh2Session implements SshSession {
  constructor(
    private readonly client: SshClientLike,
    private readonly signal?: AbortSignal
  ) {}

  exec(command: string, timeoutMs = 10_000): Promise<CommandResult> {
    throwIfAborted(this.signal);

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let settled = false;
      let stream: SshExecStreamLike | undefined;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const cleanup = () => {
        if (timer) clearTimeout(timer);
        this.signal?.removeEventListener('abort', onAbort);
      };
      const finishResolve = (result: CommandResult) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(result);
      };
      const finishReject = (streamError: Error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(streamError);
      };
      const onAbort = () => {
        stream?.close();
        this.client.end();
        finishReject(createAbortError());
      };

      this.signal?.addEventListener('abort', onAbort, { once: true });
      this.client.exec(command, (error, openedStream) => {
        if (settled) {
          openedStream?.close();
          return;
        }
        if (error) {
          finishReject(error);
          return;
        }

        stream = openedStream;
        if (this.signal?.aborted) {
          onAbort();
          return;
        }
        timer = setTimeout(() => {
          stream?.close();
          finishReject(new Error(`SSH command timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        stream.on('data', (chunk: Buffer) => {
          stdout += chunk.toString('utf8');
        });
        stream.stderr.on('data', (chunk: Buffer) => {
          stderr += chunk.toString('utf8');
        });
        stream.on('close', (code?: number) => {
          finishResolve({
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            code: code ?? 0
          });
        });
        stream.on('error', finishReject);
      });
      if (this.signal?.aborted) onAbort();
    });
  }

  close(): void {
    this.client.end();
  }
}

function warnAboutPermissiveHostVerification(host: string): void {
  if (hasWarnedAboutPermissiveHostVerification) {
    return;
  }

  hasWarnedAboutPermissiveHostVerification = true;
  logger.warn('Host key verification is disabled. Restrict network access to trusted hosts.', {
    event: 'security.host_verification_disabled',
    host
  });
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function getRuntimeProfile(): RuntimeProfile {
  const value = process.env.MCP_PROFILE;
  return value === 'remote-safe' || value === 'chatgpt' || value === 'claude' ? value : 'full';
}

function parseCsv(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parsePositiveInteger(value: string | undefined, defaultValue: number): number {
  if (!value) {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

function parsePortList(value: string | undefined): number[] {
  return parseCsv(value)
    .map((entry) => Number.parseInt(entry, 10))
    .filter((entry) => Number.isFinite(entry) && entry > 0 && entry <= 65_535);
}

function ipv4ToInteger(value: string): number | null {
  const parts = value.split('.');
  if (parts.length !== 4) {
    return null;
  }

  const octets = parts.map((part) => Number.parseInt(part, 10));
  if (octets.some((octet) => !Number.isFinite(octet) || octet < 0 || octet > 255)) {
    return null;
  }

  return octets.reduce((acc, octet) => (acc << 8) + octet, 0) >>> 0;
}

function cidrContains(pattern: string, host: string): boolean {
  const [network, prefixText] = pattern.split('/');
  if (!network || !prefixText) {
    return false;
  }

  const prefix = Number.parseInt(prefixText, 10);
  if (!Number.isFinite(prefix) || prefix < 0 || prefix > 32) {
    return false;
  }

  const networkValue = ipv4ToInteger(network);
  const hostValue = ipv4ToInteger(host);
  if (networkValue === null || hostValue === null) {
    return false;
  }

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (networkValue & mask) === (hostValue & mask);
}

function allowlistEntryMatchesHost(entry: string, host: string): boolean {
  return entry.includes('/') ? cidrContains(entry, host) : entry === host;
}
function isHostAllowed(host: string, allowedHosts: string[]): boolean {
  if (allowedHosts.length === 0) {
    return false;
  }

  return allowedHosts.some((entry) => allowlistEntryMatchesHost(entry, host));
}

function assertProfileConnectionAllowed(connection: ConnectionInput): void {
  const profile = getRuntimeProfile();
  if (profile === 'full') {
    assertSshPolicyConnectionAllowed(connection, profile);
    return;
  }

  if (connection.password || connection.privateKey || connection.passphrase) {
    throw new Error(`${profile} profile does not accept raw SSH credentials in tool inputs.`);
  }

  assertSshPolicyConnectionAllowed(connection, profile);
}

function assertSshPolicyConnectionAllowed(
  connection: ConnectionInput,
  profile: RuntimeProfile = getRuntimeProfile()
): void {
  const allowedHosts = parseCsv(process.env.MCP_SSH_ALLOWED_HOSTS);
  const allowedUsers = parseCsv(process.env.MCP_SSH_ALLOWED_USERS);
  const allowedPorts = parsePortList(process.env.MCP_SSH_ALLOWED_PORTS);
  const port = connection.port ?? 22;

  if (profile !== 'full' && !isHostAllowed(connection.host, allowedHosts)) {
    throw new Error(
      `${profile} profile requires MCP_SSH_ALLOWED_HOSTS to include ${connection.host}.`
    );
  }

  if (
    profile === 'full' &&
    allowedHosts.length > 0 &&
    !isHostAllowed(connection.host, allowedHosts)
  ) {
    throw new Error(`SSH host ${connection.host} is not allowed by MCP_SSH_ALLOWED_HOSTS.`);
  }

  if (allowedUsers.length > 0 && !allowedUsers.includes(connection.username)) {
    throw new Error(`SSH username ${connection.username} is not allowed by MCP_SSH_ALLOWED_USERS.`);
  }

  if (allowedPorts.length > 0 && !allowedPorts.includes(port)) {
    throw new Error(`SSH port ${port} is not allowed by MCP_SSH_ALLOWED_PORTS.`);
  }
}

function hostPolicyKey(connection: ConnectionInput): string {
  return `${connection.host}:${connection.port ?? 22}`;
}

function acquireHostConcurrencySlot(connection: ConnectionInput): boolean {
  const limit = parsePositiveInteger(process.env.MCP_SSH_MAX_SESSIONS_PER_HOST, 0);
  if (limit === 0) {
    return true;
  }

  const key = hostPolicyKey(connection);
  const active = activeSessionsByHost.get(key) ?? 0;
  if (active >= limit) {
    return false;
  }

  activeSessionsByHost.set(key, active + 1);
  return true;
}

function releaseHostConcurrencySlot(connection: ConnectionInput): void {
  const key = hostPolicyKey(connection);
  const active = activeSessionsByHost.get(key) ?? 0;
  if (active <= 1) {
    activeSessionsByHost.delete(key);
    return;
  }

  activeSessionsByHost.set(key, active - 1);
}

function assertConnectionAttemptAllowed(connection: ConnectionInput): void {
  const limit = parsePositiveInteger(process.env.MCP_SSH_MAX_CONNECTION_ATTEMPTS_PER_MINUTE, 0);
  if (limit === 0) {
    return;
  }

  const key = hostPolicyKey(connection);
  const currentWindow = Math.floor(Date.now() / 60_000);
  const existing = attemptsByHost.get(key);
  const entry =
    existing && existing.windowStart === currentWindow
      ? existing
      : { windowStart: currentWindow, count: 0 };

  entry.count += 1;
  attemptsByHost.set(key, entry);

  if (entry.count > limit) {
    throw new Error(`SSH connection attempt limit exceeded for ${connection.host}.`);
  }
}

function defaultKnownHostsPath(): string {
  return path.join(os.homedir(), '.ssh', 'known_hosts');
}

function expandHomePath(filePath: string): string {
  const homePrefix = filePath.match(/^~(?:[/\\]|$)/)?.[0];
  if (!homePrefix) {
    return filePath;
  }

  const remainder = filePath.slice(homePrefix.length);
  return remainder ? path.join(os.homedir(), remainder) : os.homedir();
}

function normalizeFingerprint(fingerprint: string): string {
  const trimmed = fingerprint.trim();
  const withoutPrefix = trimmed.toLowerCase().startsWith(SHA256_FINGERPRINT_PREFIX.toLowerCase())
    ? trimmed.slice(SHA256_FINGERPRINT_PREFIX.length)
    : trimmed;

  return stripTrailingBase64Padding(withoutPrefix);
}

function fingerprintHostKey(key: Buffer): string {
  return stripTrailingBase64Padding(createHash('sha256').update(key).digest('base64'));
}

function stripTrailingBase64Padding(value: string): string {
  let end = value.length;
  while (end > 0 && value[end - 1] === BASE64_PADDING_CHARACTER) {
    end -= 1;
  }

  return end === value.length ? value : value.slice(0, end);
}

function safeEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function parseKnownHosts(filePath: string): KnownHostEntry[] {
  if (!existsSync(filePath)) {
    return [];
  }

  return readFileSync(filePath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#') && !line.startsWith('@'))
    .map((line) => line.split(/\s+/))
    .filter((parts) => parts.length >= 3)
    .map((parts) => ({
      hosts: (parts[0] ?? '').split(','),
      keyType: parts[1] ?? '',
      key: Buffer.from(parts[2] ?? '', 'base64')
    }))
    .filter((entry) => entry.key.length > 0);
}

function hostPatterns(host: string, port: number): string[] {
  return [host, `[${host}]:${port}`];
}

function hashedHostMatches(candidate: string, hostPattern: string): boolean {
  const [, version, saltBase64, hashBase64] = candidate.split('|');
  if (version !== '1' || !saltBase64 || !hashBase64) {
    return false;
  }

  const salt = Buffer.from(saltBase64, 'base64');
  const expected = createHmac('sha1', salt).update(hostPattern).digest('base64');
  return safeEquals(expected, hashBase64);
}

function hostPatternMatches(candidate: string, hostPattern: string): boolean {
  return candidate.startsWith('|1|')
    ? hashedHostMatches(candidate, hostPattern)
    : candidate === hostPattern;
}

function knownHostMatches(entry: KnownHostEntry, host: string, port: number, key: Buffer): boolean {
  const patterns = hostPatterns(host, port);
  if (
    !entry.hosts.some((candidate) =>
      patterns.some((pattern) => hostPatternMatches(candidate, pattern))
    )
  ) {
    return false;
  }

  return safeEquals(entry.key.toString('base64'), key.toString('base64'));
}

function createStrictHostVerifier(connection: ConnectionInput): (key: Buffer) => boolean {
  const host = connection.host;
  const port = connection.port ?? 22;
  const pinnedFingerprint = connection.hostKeySha256
    ? normalizeFingerprint(connection.hostKeySha256)
    : undefined;
  const knownHostsPath =
    connection.knownHostsPath ?? process.env.MCP_SSH_KNOWN_HOSTS ?? defaultKnownHostsPath();
  const expandedKnownHostsPath = expandHomePath(knownHostsPath);

  return (key: Buffer): boolean => {
    const fingerprint = fingerprintHostKey(key);
    if (pinnedFingerprint && safeEquals(fingerprint, pinnedFingerprint)) {
      return true;
    }

    return parseKnownHosts(expandedKnownHostsPath).some((entry) =>
      knownHostMatches(entry, host, port, key)
    );
  };
}

export function createConnectConfig(connection: ConnectionInput): InfraLensConnectConfig {
  assertProfileConnectionAllowed(connection);
  const strictHostChecking = parseBoolean(process.env.MCP_SSH_STRICT_HOST_CHECKING, true);
  if (!strictHostChecking) {
    warnAboutPermissiveHostVerification(connection.host);
  }
  const hostVerifier = strictHostChecking
    ? createStrictHostVerifier(connection)
    : (key: Buffer) => {
        void key;
        return true;
      };

  return {
    host: connection.host,
    port: connection.port ?? 22,
    username: connection.username,
    readyTimeout: 10_000,
    hostVerifier,
    ...(process.env.SSH_AUTH_SOCK ? { agent: process.env.SSH_AUTH_SOCK } : {}),
    ...(connection.password ? { password: connection.password } : {}),
    ...(connection.privateKey
      ? { privateKey: connection.privateKey, passphrase: connection.passphrase }
      : {})
  };
}

export function resetSshWarningStateForTests(): void {
  hasWarnedAboutPermissiveHostVerification = false;
  activeSessionsByHost.clear();
  attemptsByHost.clear();
}

export async function withSshSession<T>(
  connection: ConnectionInput,
  callback: (session: SshSession) => Promise<T>,
  clientFactory: () => SshClientLike = () => new Client(),
  signal?: AbortSignal
): Promise<T> {
  const client = clientFactory();
  const session = new Ssh2Session(client, signal);
  const config = createConnectConfig(connection);
  assertConnectionAttemptAllowed(connection);
  const acquiredConcurrencySlot = acquireHostConcurrencySlot(connection);
  if (!acquiredConcurrencySlot) {
    throw new Error(`SSH session concurrency limit exceeded for ${connection.host}.`);
  }

  try {
    throwIfAborted(signal);
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const onReady = () => finishResolve();
      const onError = (error: Error) => finishReject(error);
      const cleanup = () => {
        signal?.removeEventListener('abort', onAbort);
        client.removeListener('ready', onReady);
        client.removeListener('error', onError);
      };
      const finishResolve = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      };
      const finishReject = (error: Error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };
      const onAbort = () => {
        client.end();
        finishReject(createAbortError());
      };

      signal?.addEventListener('abort', onAbort, { once: true });
      client.once('ready', onReady);
      client.once('error', onError);
      client.connect(config);
      if (signal?.aborted) onAbort();
    });

    throwIfAborted(signal);
    return await callback(session);
  } catch (error) {
    if (!isAbortError(error)) {
      logger.error('SSH command execution failed', {
        host: connection.host,
        error: error instanceof Error ? error.message : String(error)
      });
    }
    throw error;
  } finally {
    releaseHostConcurrencySlot(connection);
    session.close();
  }
}
