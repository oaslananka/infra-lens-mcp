import { timingSafeEqual } from 'node:crypto';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';

type HttpAuthMode = 'none' | 'bearer' | 'oauth-gateway';
type HttpProfile = 'full' | 'remote-safe' | 'chatgpt' | 'claude';

export interface HttpConfig {
  host: string;
  port: number;
  profile: HttpProfile;
  allowedOrigins: string[];
  allowedHosts: string[];
  authMode: HttpAuthMode;
  bearerToken?: string;
  gatewayHeader: string;
  gatewaySecret?: string;
  bodyLimitBytes: number;
  authorizationServers: string[];
  resourceUrl?: string;
  endpointPath: string;
  requestTimeoutMs: number;
  maxConcurrentRequests: number;
  rateLimitPerMinute: number;
}

export interface HttpDecision {
  ok: boolean;
  statusCode?: number;
  message?: string;
  headers?: Record<string, string>;
}

const DEFAULT_BODY_LIMIT_BYTES = 1024 * 1024;
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_CONCURRENT_REQUESTS = 100;
const SUPPORTED_HTTP_PROTOCOL_VERSIONS = new Set(['2025-11-25', '2025-06-18', '2025-03-26']);

function constantTimeEquals(actual: string, expected: string): boolean {
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);

  if (actualBytes.length !== expectedBytes.length) {
    return false;
  }

  return timingSafeEqual(actualBytes, expectedBytes);
}

function parseCsv(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseInteger(value: string | undefined, defaultValue: number): number {
  if (!value) {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

function normalizeEndpointPath(value: string | undefined): string {
  const trimmed = (value ?? '/mcp').trim();
  if (!trimmed || trimmed === '/') {
    return '/mcp';
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  let end = withLeadingSlash.length;
  while (end > 1 && withLeadingSlash.codePointAt(end - 1) === 47) {
    end -= 1;
  }
  return withLeadingSlash.slice(0, end) || '/mcp';
}

function parseAuthMode(value: string | undefined): HttpAuthMode {
  if (value === 'bearer') {
    return 'bearer';
  }

  if (value === 'oauth-gateway' || value === 'oauth') {
    return 'oauth-gateway';
  }

  return 'none';
}

function parseProfile(value: string | undefined): HttpProfile {
  return value === 'remote-safe' || value === 'chatgpt' || value === 'claude' ? value : 'full';
}

export function parseHttpConfig(env: Record<string, string | undefined>): HttpConfig {
  return {
    host: env.MCP_HTTP_HOST ?? env.HOST ?? '127.0.0.1',
    port: parseInteger(env.MCP_HTTP_PORT ?? env.PORT, 3000),
    profile: parseProfile(env.MCP_PROFILE),
    allowedOrigins: parseCsv(env.MCP_HTTP_ALLOWED_ORIGINS),
    allowedHosts: parseCsv(env.MCP_HTTP_ALLOWED_HOSTS),
    authMode: parseAuthMode(env.MCP_HTTP_AUTH_MODE),
    bearerToken: env.MCP_HTTP_BEARER_TOKEN,
    gatewayHeader: (env.MCP_HTTP_OAUTH_GATEWAY_HEADER ?? 'x-infra-lens-gateway-auth').toLowerCase(),
    gatewaySecret: env.MCP_HTTP_OAUTH_GATEWAY_SECRET,
    bodyLimitBytes: parseInteger(env.MCP_HTTP_BODY_LIMIT_BYTES, DEFAULT_BODY_LIMIT_BYTES),
    authorizationServers: parseCsv(env.MCP_HTTP_AUTHORIZATION_SERVERS),
    resourceUrl: env.MCP_HTTP_RESOURCE_URL,
    endpointPath: normalizeEndpointPath(env.MCP_HTTP_ENDPOINT_PATH),
    requestTimeoutMs: parseInteger(env.MCP_HTTP_REQUEST_TIMEOUT_MS, DEFAULT_REQUEST_TIMEOUT_MS),
    maxConcurrentRequests: parseInteger(
      env.MCP_HTTP_MAX_CONCURRENT_REQUESTS,
      DEFAULT_MAX_CONCURRENT_REQUESTS
    ),
    rateLimitPerMinute: parseInteger(env.MCP_HTTP_RATE_LIMIT_PER_MINUTE, 0)
  };
}

function isLoopbackHost(host: string): boolean {
  return ['127.0.0.1', '::1', 'localhost'].includes(host);
}

function isRemoteSafeProfile(profile: HttpProfile): boolean {
  return profile === 'remote-safe' || profile === 'chatgpt' || profile === 'claude';
}

export function validateHttpConfiguration(config: HttpConfig): void {
  if (config.authMode === 'bearer' && !config.bearerToken) {
    throw new Error('MCP_HTTP_AUTH_MODE=bearer requires MCP_HTTP_BEARER_TOKEN.');
  }

  if (config.authMode === 'oauth-gateway') {
    if (config.authorizationServers.length === 0) {
      throw new Error('MCP_HTTP_AUTH_MODE=oauth-gateway requires MCP_HTTP_AUTHORIZATION_SERVERS.');
    }

    if (!config.resourceUrl || !config.resourceUrl.startsWith('https://')) {
      throw new Error('MCP_HTTP_AUTH_MODE=oauth-gateway requires an HTTPS MCP_HTTP_RESOURCE_URL.');
    }

    if (!config.gatewaySecret) {
      throw new Error('MCP_HTTP_AUTH_MODE=oauth-gateway requires MCP_HTTP_OAUTH_GATEWAY_SECRET.');
    }
  }

  if (isLoopbackHost(config.host)) {
    return;
  }

  if (!isRemoteSafeProfile(config.profile)) {
    throw new Error('Non-loopback HTTP requires MCP_PROFILE=remote-safe, chatgpt, or claude.');
  }

  if (config.authMode === 'none') {
    throw new Error('Non-loopback HTTP requires MCP_HTTP_AUTH_MODE=bearer or oauth-gateway.');
  }

  if (config.allowedOrigins.length === 0) {
    throw new Error('Non-loopback HTTP requires MCP_HTTP_ALLOWED_ORIGINS.');
  }

  if (config.allowedHosts.length === 0) {
    throw new Error('Non-loopback HTTP requires MCP_HTTP_ALLOWED_HOSTS.');
  }
}

export interface ConcurrencyLimiter {
  tryAcquire(): boolean;
  release(): void;
  active(): number;
}

export function createConcurrencyLimiter(maxConcurrentRequests: number): ConcurrencyLimiter {
  let activeRequests = 0;

  return {
    tryAcquire() {
      if (activeRequests >= maxConcurrentRequests) {
        return false;
      }

      activeRequests += 1;
      return true;
    },
    release() {
      activeRequests = Math.max(0, activeRequests - 1);
    },
    active() {
      return activeRequests;
    }
  };
}

export interface RateLimiter {
  check(clientKey: string): HttpDecision;
}

export function createRateLimiter(
  requestsPerMinute: number,
  now: () => number = () => Date.now()
): RateLimiter {
  const windows = new Map<string, { windowStart: number; count: number }>();

  return {
    check(clientKey: string) {
      if (requestsPerMinute <= 0) {
        return { ok: true };
      }

      const currentWindow = Math.floor(now() / 60_000);
      const existing = windows.get(clientKey);
      const entry =
        existing && existing.windowStart === currentWindow
          ? existing
          : { windowStart: currentWindow, count: 0 };

      entry.count += 1;
      windows.set(clientKey, entry);

      if (entry.count > requestsPerMinute) {
        return {
          ok: false,
          statusCode: 429,
          message: 'Too many requests.',
          headers: { 'Retry-After': '60' }
        };
      }

      return { ok: true };
    }
  };
}

export function validateOriginHeader(origin: string | undefined, config: HttpConfig): HttpDecision {
  if (config.allowedOrigins.length === 0) {
    return { ok: true };
  }

  if (!origin) {
    return { ok: false, statusCode: 403, message: 'Origin is required.' };
  }

  if (!config.allowedOrigins.includes(origin)) {
    return { ok: false, statusCode: 403, message: 'Origin is not allowed.' };
  }

  return { ok: true };
}

function hostWithoutPort(hostHeader: string): string {
  if (hostHeader.startsWith('[')) {
    const closingBracketIndex = hostHeader.indexOf(']');
    return closingBracketIndex === -1 ? hostHeader : hostHeader.slice(1, closingBracketIndex);
  }

  return hostHeader.split(':')[0] ?? hostHeader;
}

export function validateHostHeader(host: string | undefined, config: HttpConfig): HttpDecision {
  if (config.allowedHosts.length === 0) {
    return { ok: true };
  }

  if (!host) {
    return { ok: false, statusCode: 400, message: 'Host is required.' };
  }

  const normalizedHost = host.toLowerCase();
  const bareHost = hostWithoutPort(normalizedHost);
  const allowedHosts = config.allowedHosts.map((entry) => entry.toLowerCase());

  if (!allowedHosts.includes(normalizedHost) && !allowedHosts.includes(bareHost)) {
    return { ok: false, statusCode: 403, message: 'Host is not allowed.' };
  }

  return { ok: true };
}

function wwwAuthenticateHeader(config: HttpConfig): string {
  const resourceMetadata = config.resourceUrl
    ? `${config.resourceUrl.replace(/\/$/, '')}/.well-known/oauth-protected-resource`
    : '/.well-known/oauth-protected-resource';

  return `Bearer realm="infra-lens-mcp", resource_metadata="${resourceMetadata}"`;
}

export function authorizeHttpRequest(
  authorization: string | undefined,
  config: HttpConfig,
  headers: IncomingHttpHeaders = {}
): HttpDecision {
  if (config.authMode === 'none') {
    return { ok: true };
  }

  if (config.authMode === 'bearer') {
    if (!authorization) {
      return {
        ok: false,
        statusCode: 401,
        message: 'Authentication is required.',
        headers: { 'WWW-Authenticate': wwwAuthenticateHeader(config) }
      };
    }

    const expected = `Bearer ${config.bearerToken}`;
    return constantTimeEquals(authorization, expected)
      ? { ok: true }
      : {
          ok: false,
          statusCode: 401,
          message: 'Authentication is invalid.',
          headers: { 'WWW-Authenticate': wwwAuthenticateHeader(config) }
        };
  }

  const gatewayValue = firstHeader(headers, config.gatewayHeader);
  if (!gatewayValue) {
    return {
      ok: false,
      statusCode: 401,
      message: 'OAuth gateway authentication is required.',
      headers: { 'WWW-Authenticate': wwwAuthenticateHeader(config) }
    };
  }

  return constantTimeEquals(gatewayValue, config.gatewaySecret ?? '')
    ? { ok: true }
    : {
        ok: false,
        statusCode: 403,
        message: 'OAuth gateway authentication is invalid.',
        headers: { 'WWW-Authenticate': wwwAuthenticateHeader(config) }
      };
}

function headerIncludes(headers: IncomingHttpHeaders, name: string, expected: string): boolean {
  const value = headers[name.toLowerCase()];
  const values = Array.isArray(value) ? value : [value];
  return values
    .filter((entry): entry is string => typeof entry === 'string')
    .flatMap((entry) => entry.split(','))
    .map((entry) => entry.trim().toLowerCase())
    .includes(expected.toLowerCase());
}

function firstHeader(headers: IncomingHttpHeaders, name: string): string | undefined {
  const value = headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function requestPath(url: string | undefined): string {
  try {
    return new URL(url ?? '/', 'http://localhost').pathname;
  } catch {
    return '/';
  }
}

export function validateMcpHttpRequest(
  request: Pick<IncomingMessage, 'method' | 'url'> & { headers: IncomingHttpHeaders },
  config: HttpConfig
): HttpDecision {
  if (requestPath(request.url) !== config.endpointPath) {
    return { ok: false, statusCode: 404, message: 'MCP endpoint was not found.' };
  }

  const sessionId = firstHeader(request.headers, 'mcp-session-id');
  if (sessionId) {
    return {
      ok: false,
      statusCode: 400,
      message: 'MCP-Session-Id is not supported by the stateless HTTP transport.'
    };
  }

  const method = request.method ?? 'GET';
  if (method === 'GET') {
    return {
      ok: false,
      statusCode: 405,
      message: 'HTTP GET streaming is not supported by this server.',
      headers: { Allow: 'POST' }
    };
  }

  if (method !== 'POST') {
    return {
      ok: false,
      statusCode: 405,
      message: 'HTTP method is not allowed for the MCP endpoint.',
      headers: { Allow: 'POST' }
    };
  }

  if (
    !headerIncludes(request.headers, 'accept', 'application/json') ||
    !headerIncludes(request.headers, 'accept', 'text/event-stream')
  ) {
    return {
      ok: false,
      statusCode: 406,
      message: 'Accept header must include application/json and text/event-stream.'
    };
  }

  const contentType = firstHeader(request.headers, 'content-type');
  if (!contentType || !contentType.toLowerCase().split(';')[0]?.trim().endsWith('/json')) {
    return {
      ok: false,
      statusCode: 415,
      message: 'Content-Type must be application/json.'
    };
  }

  const protocolVersion = firstHeader(request.headers, 'mcp-protocol-version');
  if (protocolVersion && !SUPPORTED_HTTP_PROTOCOL_VERSIONS.has(protocolVersion)) {
    return {
      ok: false,
      statusCode: 400,
      message: 'MCP-Protocol-Version is not supported.'
    };
  }

  return { ok: true };
}

export function createProtectedResourceMetadata(config: HttpConfig): Record<string, unknown> {
  return {
    resource: config.resourceUrl ?? `http://${config.host}:${config.port}`,
    authorization_servers: config.authorizationServers,
    bearer_methods_supported: ['header'],
    scopes_supported: ['mcp:read'],
    oauth_strategy: 'external_gateway'
  };
}

export async function readJsonBodyWithLimit(
  request: IncomingMessage,
  limitBytes: number
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let receivedBytes = 0;
    let rejected = false;

    request.on('data', (chunk: Buffer) => {
      receivedBytes += chunk.length;
      if (receivedBytes > limitBytes) {
        rejected = true;
        reject(new Error('Request body is too large.'));
        request.destroy();
        return;
      }

      chunks.push(chunk);
    });
    request.on('end', () => {
      if (rejected) {
        return;
      }

      if (chunks.length === 0) {
        resolve(undefined);
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Error('Request body must be valid JSON.'));
      }
    });
    request.on('error', (error) => {
      reject(error instanceof Error ? error : new Error(String(error)));
    });
  });
}

export function sendJsonError(
  response: ServerResponse,
  statusCode: number,
  message: string,
  headers: Record<string, string> = {}
): void {
  response.statusCode = statusCode;
  for (const [key, value] of Object.entries(headers)) {
    response.setHeader(key, value);
  }
  response.setHeader('content-type', 'application/json');
  response.setHeader('x-content-type-options', 'nosniff');
  response.setHeader('cache-control', 'no-store');
  response.end(JSON.stringify({ error: message }));
}
