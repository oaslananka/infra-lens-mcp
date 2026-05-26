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

class Ssh2Session implements SshSession {
  constructor(private readonly client: SshClientLike) {}

  exec(command: string, timeoutMs = 10_000): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
      this.client.exec(command, (error, stream) => {
        if (error) {
          reject(error);
          return;
        }

        let stdout = '';
        let stderr = '';
        const timer = setTimeout(() => {
          stream.close();
          reject(new Error(`SSH command timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        stream.on('data', (chunk: Buffer) => {
          stdout += chunk.toString('utf8');
        });
        stream.stderr.on('data', (chunk: Buffer) => {
          stderr += chunk.toString('utf8');
        });
        stream.on('close', (code?: number) => {
          clearTimeout(timer);
          resolve({
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            code: code ?? 0
          });
        });
        stream.on('error', (streamError: Error) => {
          clearTimeout(timer);
          reject(streamError);
        });
      });
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

function isHostAllowed(host: string, allowedHosts: string[]): boolean {
  if (allowedHosts.length === 0) {
    return false;
  }

  return allowedHosts.includes(host);
}

function assertProfileConnectionAllowed(connection: ConnectionInput): void {
  const profile = getRuntimeProfile();
  if (profile === 'full') {
    return;
  }

  if (connection.password || connection.privateKey || connection.passphrase) {
    throw new Error(`${profile} profile does not accept raw SSH credentials in tool inputs.`);
  }

  const allowedHosts = parseCsv(process.env.MCP_SSH_ALLOWED_HOSTS);
  if (!isHostAllowed(connection.host, allowedHosts)) {
    throw new Error(
      `${profile} profile requires MCP_SSH_ALLOWED_HOSTS to include ${connection.host}.`
    );
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
}

export async function withSshSession<T>(
  connection: ConnectionInput,
  callback: (session: SshSession) => Promise<T>,
  clientFactory: () => SshClientLike = () => new Client()
): Promise<T> {
  const client = clientFactory();
  const session = new Ssh2Session(client);
  const config = createConnectConfig(connection);

  await new Promise<void>((resolve, reject) => {
    client.once('ready', () => resolve());
    client.once('error', reject);
    client.connect(config);
  });

  try {
    return await callback(session);
  } catch (error) {
    logger.error('SSH command execution failed', {
      host: connection.host,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  } finally {
    session.close();
  }
}
