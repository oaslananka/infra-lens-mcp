import { describe, expect, it } from '@jest/globals';
import { Readable } from 'node:stream';

import {
  authorizeHttpRequest,
  createConcurrencyLimiter,
  createRateLimiter,
  parseHttpConfig,
  readJsonBodyWithLimit,
  sendJsonError,
  validateHostHeader,
  validateHttpConfiguration,
  validateMcpHttpRequest,
  validateOriginHeader
} from '../../src/http-security.js';

describe('HTTP security configuration', () => {
  it('parses the canonical MCP endpoint path with a /mcp default', () => {
    expect(parseHttpConfig({}).endpointPath).toBe('/mcp');
    expect(parseHttpConfig({ MCP_HTTP_ENDPOINT_PATH: 'custom/' }).endpointPath).toBe('/custom');
    expect(
      parseHttpConfig({ MCP_HTTP_ENDPOINT_PATH: `custom${'/'.repeat(20_000)}` }).endpointPath
    ).toBe('/custom');
  });

  it('parses request hardening defaults and environment overrides', () => {
    expect(parseHttpConfig({})).toMatchObject({
      requestTimeoutMs: 30_000,
      maxConcurrentRequests: 100,
      rateLimitPerMinute: 0
    });

    expect(
      parseHttpConfig({
        MCP_HTTP_REQUEST_TIMEOUT_MS: '5000',
        MCP_HTTP_MAX_CONCURRENT_REQUESTS: '2',
        MCP_HTTP_RATE_LIMIT_PER_MINUTE: '10'
      })
    ).toMatchObject({
      requestTimeoutMs: 5000,
      maxConcurrentRequests: 2,
      rateLimitPerMinute: 10
    });
  });

  it('accepts POST requests to the canonical MCP endpoint with required headers', () => {
    const config = parseHttpConfig({});

    expect(
      validateMcpHttpRequest(
        {
          method: 'POST',
          url: '/mcp',
          headers: {
            accept: 'application/json, text/event-stream',
            'content-type': 'application/json',
            'mcp-protocol-version': '2025-11-25'
          }
        },
        config
      )
    ).toEqual({ ok: true });
  });

  it('rejects wrong HTTP paths before body parsing', () => {
    expect(
      validateMcpHttpRequest(
        {
          method: 'POST',
          url: '/wrong',
          headers: {
            accept: 'application/json, text/event-stream',
            'content-type': 'application/json'
          }
        },
        parseHttpConfig({})
      )
    ).toMatchObject({ ok: false, statusCode: 404 });
  });

  it('returns 405 for unsupported MCP endpoint methods including GET', () => {
    const config = parseHttpConfig({});

    expect(
      validateMcpHttpRequest({ method: 'GET', url: '/mcp', headers: {} }, config)
    ).toMatchObject({
      ok: false,
      statusCode: 405,
      headers: { Allow: 'POST' }
    });
    expect(
      validateMcpHttpRequest({ method: 'DELETE', url: '/mcp', headers: {} }, config)
    ).toMatchObject({
      ok: false,
      statusCode: 405,
      headers: { Allow: 'POST' }
    });
  });

  it('rejects missing Accept and invalid Content-Type for POST', () => {
    const config = parseHttpConfig({});

    expect(
      validateMcpHttpRequest(
        { method: 'POST', url: '/mcp', headers: { 'content-type': 'application/json' } },
        config
      )
    ).toMatchObject({ ok: false, statusCode: 406 });
    expect(
      validateMcpHttpRequest(
        {
          method: 'POST',
          url: '/mcp',
          headers: { accept: 'application/json, text/event-stream', 'content-type': 'text/plain' }
        },
        config
      )
    ).toMatchObject({ ok: false, statusCode: 415 });
  });

  it('rejects client session identifiers because HTTP mode is stateless', () => {
    const decision = validateMcpHttpRequest(
      {
        method: 'POST',
        url: '/mcp',
        headers: {
          accept: 'application/json, text/event-stream',
          'content-type': 'application/json',
          'mcp-session-id': 'session-should-not-leak'
        }
      },
      parseHttpConfig({})
    );

    expect(decision).toMatchObject({
      ok: false,
      statusCode: 400,
      message: 'MCP-Session-Id is not supported by the stateless HTTP transport.'
    });
    expect(decision.message).not.toContain('session-should-not-leak');
  });

  it('accepts current and backward-compatible MCP protocol versions', () => {
    const config = parseHttpConfig({});

    for (const version of ['2025-11-25', '2025-06-18', '2025-03-26']) {
      expect(
        validateMcpHttpRequest(
          {
            method: 'POST',
            url: '/mcp?transport=streamable',
            headers: {
              accept: 'application/json, text/event-stream',
              'content-type': 'application/json; charset=utf-8',
              'mcp-protocol-version': version
            }
          },
          config
        )
      ).toEqual({ ok: true });
    }
  });

  it('rejects unsupported MCP protocol versions', () => {
    expect(
      validateMcpHttpRequest(
        {
          method: 'POST',
          url: '/mcp',
          headers: {
            accept: 'application/json, text/event-stream',
            'content-type': 'application/json',
            'mcp-protocol-version': '2099-01-01'
          }
        },
        parseHttpConfig({})
      )
    ).toMatchObject({ ok: false, statusCode: 400 });
  });
  it('allows loopback HTTP without auth for local development', () => {
    const config = parseHttpConfig({
      MCP_HTTP_HOST: '127.0.0.1',
      MCP_HTTP_PORT: '3000',
      MCP_HTTP_AUTH_MODE: 'none'
    });

    expect(() => validateHttpConfiguration(config)).not.toThrow();
  });

  it('fails fast for non-loopback HTTP without a remote-safe authenticated profile', () => {
    const config = parseHttpConfig({
      MCP_HTTP_HOST: '0.0.0.0',
      MCP_HTTP_AUTH_MODE: 'none'
    });

    expect(() => validateHttpConfiguration(config)).toThrow(
      /Non-loopback HTTP requires MCP_PROFILE=remote-safe/
    );
  });

  it('requires allowed origins and allowed hosts when HTTP is exposed beyond loopback', () => {
    const config = parseHttpConfig({
      MCP_HTTP_HOST: '0.0.0.0',
      MCP_PROFILE: 'remote-safe',
      MCP_HTTP_AUTH_MODE: 'bearer',
      MCP_HTTP_BEARER_TOKEN: 'dev-token'
    });

    expect(() => validateHttpConfiguration(config)).toThrow(/MCP_HTTP_ALLOWED_ORIGINS/);
  });

  it('rejects missing or invalid Origin when origin enforcement is enabled', () => {
    const config = parseHttpConfig({
      MCP_HTTP_ALLOWED_ORIGINS: 'https://client.example.com'
    });

    expect(validateOriginHeader(undefined, config)).toEqual({
      ok: false,
      statusCode: 403,
      message: 'Origin is required.'
    });
    expect(validateOriginHeader('https://evil.example.com', config)).toEqual({
      ok: false,
      statusCode: 403,
      message: 'Origin is not allowed.'
    });
    expect(validateOriginHeader('https://client.example.com', config)).toEqual({ ok: true });
  });

  it('rejects missing or invalid Host when a host allowlist is configured', () => {
    const config = parseHttpConfig({
      MCP_HTTP_ALLOWED_HOSTS: 'mcp.example.com,localhost:3000'
    });

    expect(validateHostHeader(undefined, config)).toEqual({
      ok: false,
      statusCode: 400,
      message: 'Host is required.'
    });
    expect(validateHostHeader('evil.example.com', config)).toEqual({
      ok: false,
      statusCode: 403,
      message: 'Host is not allowed.'
    });
    expect(validateHostHeader('mcp.example.com', config)).toEqual({ ok: true });
    expect(validateHostHeader('localhost:3000', config)).toEqual({ ok: true });
  });

  it('accepts and rejects bearer authentication deterministically', () => {
    const config = parseHttpConfig({
      MCP_HTTP_AUTH_MODE: 'bearer',
      MCP_HTTP_BEARER_TOKEN: 'expected-token'
    });

    expect(authorizeHttpRequest(undefined, config)).toMatchObject({
      ok: false,
      statusCode: 401,
      message: 'Authentication is required.'
    });
    for (const invalidToken of ['Bearer x', 'Bearer rejected-token']) {
      expect(authorizeHttpRequest(invalidToken, config)).toMatchObject({
        ok: false,
        statusCode: 401,
        message: 'Authentication is invalid.'
      });
    }
    expect(authorizeHttpRequest('Bearer expected-token', config)).toEqual({ ok: true });
  });

  it('requires explicit gateway configuration for OAuth gateway mode', () => {
    expect(() =>
      validateHttpConfiguration(
        parseHttpConfig({
          MCP_HTTP_AUTH_MODE: 'oauth-gateway'
        })
      )
    ).toThrow(/MCP_HTTP_AUTHORIZATION_SERVERS/);

    expect(() =>
      validateHttpConfiguration(
        parseHttpConfig({
          MCP_HTTP_AUTH_MODE: 'oauth-gateway',
          MCP_HTTP_AUTHORIZATION_SERVERS: 'https://auth.example.com',
          MCP_HTTP_RESOURCE_URL: 'http://mcp.example.com',
          MCP_HTTP_OAUTH_GATEWAY_SECRET: 'shared-secret'
        })
      )
    ).toThrow(/HTTPS MCP_HTTP_RESOURCE_URL/);
  });

  it('accepts only authenticated requests from the configured OAuth gateway', () => {
    const config = parseHttpConfig({
      MCP_HTTP_AUTH_MODE: 'oauth-gateway',
      MCP_HTTP_AUTHORIZATION_SERVERS: 'https://auth.example.com',
      MCP_HTTP_RESOURCE_URL: 'https://mcp.example.com',
      MCP_HTTP_OAUTH_GATEWAY_SECRET: 'shared-secret'
    });

    expect(() => validateHttpConfiguration(config)).not.toThrow();
    expect(authorizeHttpRequest(undefined, config, {})).toMatchObject({
      ok: false,
      statusCode: 401,
      message: 'OAuth gateway authentication is required.'
    });
    for (const invalidSecret of ['x', 'wrong--secret']) {
      expect(
        authorizeHttpRequest(undefined, config, {
          'x-infra-lens-gateway-auth': invalidSecret
        })
      ).toMatchObject({
        ok: false,
        statusCode: 403,
        message: 'OAuth gateway authentication is invalid.'
      });
    }
    expect(
      authorizeHttpRequest(undefined, config, { 'x-infra-lens-gateway-auth': 'shared-secret' })
    ).toEqual({ ok: true });
  });

  it('limits concurrent HTTP request handling before body processing', () => {
    const limiter = createConcurrencyLimiter(1);

    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.active()).toBe(1);
    expect(limiter.tryAcquire()).toBe(false);

    limiter.release();

    expect(limiter.active()).toBe(0);
    expect(limiter.tryAcquire()).toBe(true);
  });

  it('optionally rate-limits requests per client window', () => {
    let now = 0;
    const limiter = createRateLimiter(2, () => now);

    expect(limiter.check('client-a')).toEqual({ ok: true });
    expect(limiter.check('client-a')).toEqual({ ok: true });
    expect(limiter.check('client-a')).toMatchObject({
      ok: false,
      statusCode: 429,
      headers: { 'Retry-After': '60' }
    });

    now = 60_000;

    expect(limiter.check('client-a')).toEqual({ ok: true });
    expect(limiter.check('client-b')).toEqual({ ok: true });
  });

  it('rejects oversized JSON bodies before parsing', async () => {
    const request = Readable.from([Buffer.from('{"payload":"too large"}')]);

    await expect(readJsonBodyWithLimit(request as never, 8)).rejects.toThrow(
      'Request body is too large.'
    );
  });

  it('sends sanitized JSON errors without stack traces', () => {
    const response = {
      statusCode: 0,
      headers: {} as Record<string, string>,
      body: '',
      setHeader(key: string, value: string) {
        this.headers[key] = value;
      },
      end(body: string) {
        this.body = body;
      }
    };

    sendJsonError(response as never, 500, 'Unexpected server error.');

    expect(response.statusCode).toBe(500);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toBe('{"error":"Unexpected server error."}');
    expect(response.body).not.toContain('stack');
  });
});
