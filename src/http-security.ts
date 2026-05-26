import type { IncomingMessage, ServerResponse } from 'node:http';

type HttpAuthMode = 'none' | 'bearer' | 'oauth';
type HttpProfile = 'full' | 'remote-safe' | 'chatgpt' | 'claude';

export interface HttpConfig {
  host: string;
  port: number;
  profile: HttpProfile;
  allowedOrigins: string[];
  allowedHosts: string[];
  authMode: HttpAuthMode;
  bearerToken?: string;
  bodyLimitBytes: number;
  authorizationServers: string[];
  resourceUrl?: string;
}

export interface HttpDecision {
  ok: boolean;
  statusCode?: number;
  message?: string;
  headers?: Record<string, string>;
}

const DEFAULT_BODY_LIMIT_BYTES = 1024 * 1024;

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

function parseAuthMode(value: string | undefined): HttpAuthMode {
  return value === 'bearer' || value === 'oauth' ? value : 'none';
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
    bodyLimitBytes: parseInteger(env.MCP_HTTP_BODY_LIMIT_BYTES, DEFAULT_BODY_LIMIT_BYTES),
    authorizationServers: parseCsv(env.MCP_HTTP_AUTHORIZATION_SERVERS),
    resourceUrl: env.MCP_HTTP_RESOURCE_URL
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

  if (config.authMode === 'oauth' && config.authorizationServers.length === 0) {
    throw new Error('MCP_HTTP_AUTH_MODE=oauth requires MCP_HTTP_AUTHORIZATION_SERVERS.');
  }

  if (isLoopbackHost(config.host)) {
    return;
  }

  if (!isRemoteSafeProfile(config.profile)) {
    throw new Error('Non-loopback HTTP requires MCP_PROFILE=remote-safe, chatgpt, or claude.');
  }

  if (config.authMode === 'none') {
    throw new Error('Non-loopback HTTP requires MCP_HTTP_AUTH_MODE=bearer or oauth.');
  }

  if (config.allowedOrigins.length === 0) {
    throw new Error('Non-loopback HTTP requires MCP_HTTP_ALLOWED_ORIGINS.');
  }

  if (config.allowedHosts.length === 0) {
    throw new Error('Non-loopback HTTP requires MCP_HTTP_ALLOWED_HOSTS.');
  }
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

  return `Bearer realm="mcp-infra-lens", resource_metadata="${resourceMetadata}"`;
}

export function authorizeHttpRequest(
  authorization: string | undefined,
  config: HttpConfig
): HttpDecision {
  if (config.authMode === 'none') {
    return { ok: true };
  }

  if (!authorization) {
    return {
      ok: false,
      statusCode: 401,
      message: 'Authentication is required.',
      headers: { 'WWW-Authenticate': wwwAuthenticateHeader(config) }
    };
  }

  if (config.authMode === 'bearer') {
    const expected = `Bearer ${config.bearerToken}`;
    return authorization === expected
      ? { ok: true }
      : {
          ok: false,
          statusCode: 401,
          message: 'Authentication is invalid.',
          headers: { 'WWW-Authenticate': wwwAuthenticateHeader(config) }
        };
  }

  return {
    ok: false,
    statusCode: 501,
    message: 'OAuth validation is not implemented by this server.',
    headers: { 'WWW-Authenticate': wwwAuthenticateHeader(config) }
  };
}

export function createProtectedResourceMetadata(config: HttpConfig): Record<string, unknown> {
  return {
    resource: config.resourceUrl ?? `http://${config.host}:${config.port}`,
    authorization_servers: config.authorizationServers,
    bearer_methods_supported: ['header'],
    scopes_supported: ['mcp:read']
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
  response.end(JSON.stringify({ error: message }));
}
