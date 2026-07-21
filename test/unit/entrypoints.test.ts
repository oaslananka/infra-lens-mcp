import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';

import { isMainModule } from '../../src/entrypoint.js';
import { createStdioServer, startStdioRuntime } from '../../src/mcp.js';
import {
  createHttpRequestHandler,
  createHttpTransport,
  startHttpRuntime
} from '../../src/server-http.js';
import { parseHttpConfig } from '../../src/http-security.js';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('entrypoint runtime wiring', () => {
  it('identifies direct execution without treating imports as main modules', () => {
    const executable = '/tmp/infra-lens-entrypoint.js';
    const moduleUrl = pathToFileURL(executable).href;

    expect(isMainModule(moduleUrl, executable)).toBe(true);
    expect(isMainModule(moduleUrl, '/tmp/other.js')).toBe(false);
    expect(isMainModule(moduleUrl, undefined)).toBe(false);
  });

  it('constructs the production stdio server and HTTP transport factories', async () => {
    const stdioServer = await createStdioServer();
    expect(stdioServer).toBeDefined();
    await stdioServer.close();

    const httpTransport = await createHttpTransport();
    expect(typeof httpTransport.handleRequest).toBe('function');
    await httpTransport.close?.();
  });

  it('connects stdio once and registers idempotent shutdown handlers', async () => {
    const connect = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const close = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const exit = jest.fn<(code: number) => void>();
    const handlers = new Map<string, () => void>();
    const signals = {
      once(signal: string, handler: () => void) {
        handlers.set(signal, handler);
        return this;
      }
    };

    const runtime = await startStdioRuntime({
      server: { connect, close },
      transport: { kind: 'stdio-test' },
      signals,
      exit
    });

    expect(runtime.server).toBeDefined();
    expect(connect).toHaveBeenCalledTimes(1);
    expect(handlers.has('SIGTERM')).toBe(true);
    expect(handlers.has('SIGINT')).toBe(true);

    handlers.get('SIGTERM')?.();
    handlers.get('SIGINT')?.();
    await Promise.resolve();

    expect(close).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('supports production defaults independently for stdio server and transport selection', async () => {
    const handlers = new Map<string, () => void>();
    const signals = {
      once(signal: string, handler: () => void) {
        handlers.set(signal, handler);
        return this;
      }
    };
    const fakeTransport = {
      start: jest.fn(async () => undefined),
      send: jest.fn(async () => undefined),
      close: jest.fn(async () => undefined)
    };
    const runtimeWithDefaultServer = await startStdioRuntime({
      transport: fakeTransport,
      signals,
      exit: jest.fn()
    });
    expect(runtimeWithDefaultServer.server).toBeDefined();
    await runtimeWithDefaultServer.server.close();

    const connect = jest.fn<(_transport: unknown) => Promise<void>>().mockResolvedValue(undefined);
    const close = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const runtimeWithDefaultTransport = await startStdioRuntime({
      server: { connect, close },
      signals,
      exit: jest.fn()
    });
    expect(runtimeWithDefaultTransport.transport).toBeDefined();
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('uses the default Node HTTP server with an injected MCP transport', async () => {
    const probe = createServer();
    probe.listen(0, '127.0.0.1');
    await once(probe, 'listening');
    const address = probe.address();
    if (!address || typeof address === 'string') throw new Error('Expected TCP address.');
    const port = address.port;
    await new Promise<void>((resolve) => probe.close(() => resolve()));

    const handlers = new Map<string, () => void>();
    const signals = {
      once(signal: string, handler: () => void) {
        handlers.set(signal, handler);
        return this;
      }
    };
    const transport = { handleRequest: jest.fn(), close: jest.fn(async () => undefined) };
    const runtime = await startHttpRuntime({
      env: { MCP_HTTP_HOST: '127.0.0.1', MCP_HTTP_PORT: String(port) },
      createTransport: async () => transport,
      signals,
      exit: jest.fn(),
      logListening: jest.fn()
    });

    expect(runtime.httpServer.listening).toBe(true);
    await new Promise<void>((resolve) => runtime.httpServer.close(() => resolve()));
  });

  it('serves metadata and delegates valid MCP POST requests over a real socket', async () => {
    const config = parseHttpConfig({ MCP_HTTP_PORT: '3000' });
    const handleRequest = jest.fn(
      async (_request: IncomingMessage, response: ServerResponse, body: unknown) => {
        response.statusCode = 200;
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ body }));
      }
    );
    const handler = createHttpRequestHandler({ config, transport: { handleRequest } });
    const server = createServer(handler);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Expected a TCP address.');
    }

    try {
      const metadata = await fetch(
        `http://127.0.0.1:${address.port}/.well-known/oauth-protected-resource`
      );
      expect(metadata.status).toBe(200);
      expect(await metadata.json()).toMatchObject({ oauth_strategy: 'external_gateway' });

      const response = await fetch(`http://127.0.0.1:${address.port}/mcp`, {
        method: 'POST',
        headers: {
          accept: 'application/json, text/event-stream',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        body: { jsonrpc: '2.0', id: 1, method: 'tools/list' }
      });
      expect(handleRequest).toHaveBeenCalledTimes(1);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
    }
  });

  it('starts HTTP on the configured address and registers shutdown signals', async () => {
    const handlers = new Map<string, () => void>();
    const signals = {
      once(signal: string, handler: () => void) {
        handlers.set(signal, handler);
        return this;
      }
    };
    const close = jest.fn((callback: () => void) => {
      callback();
      return httpServer;
    });
    const listen = jest.fn((_port: number, _host: string, callback: () => void) => {
      callback();
      return httpServer;
    });
    const onceError = jest.fn(() => httpServer);
    const httpServer = { close, listen, once: onceError };
    const transportClose = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const exit = jest.fn<(code: number) => void>();

    const runtime = await startHttpRuntime({
      env: { MCP_HTTP_HOST: '127.0.0.1', MCP_HTTP_PORT: '4321' },
      createTransport: async () => ({ close: transportClose, handleRequest: jest.fn() }),
      createServer: () => httpServer as never,
      signals,
      exit,
      logListening: jest.fn()
    });

    expect(runtime.config.port).toBe(4321);
    expect(listen).toHaveBeenCalledWith(4321, '127.0.0.1', expect.any(Function));
    expect(handlers.has('SIGTERM')).toBe(true);
    handlers.get('SIGTERM')?.();
    await Promise.resolve();

    expect(close).toHaveBeenCalledTimes(1);
    expect(transportClose).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(0);
  });
});

describe('HTTP request handler branches', () => {
  async function withServer(
    handler: Parameters<typeof createServer>[0],
    run: (baseUrl: string) => Promise<void>
  ): Promise<void> {
    const server = createServer(handler);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Expected TCP address.');
    try {
      await run(`http://127.0.0.1:${address.port}`);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }

  const validHeaders = {
    accept: 'application/json, text/event-stream',
    'content-type': 'application/json'
  };

  it('rejects concurrency and rate-limit decisions before body parsing', async () => {
    const config = parseHttpConfig({});
    const transport = { handleRequest: jest.fn() };
    const concurrencyHandler = createHttpRequestHandler({
      config,
      transport,
      concurrencyLimiter: { tryAcquire: () => false, release: jest.fn(), active: () => 1 }
    });
    await withServer(concurrencyHandler, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/mcp`, { method: 'POST', headers: validHeaders });
      expect(response.status).toBe(503);
      expect(response.headers.get('retry-after')).toBe('1');
    });

    const rateHandler = createHttpRequestHandler({
      config,
      transport,
      rateLimiter: {
        check: () => ({
          ok: false,
          statusCode: 429,
          message: 'rate blocked',
          headers: { 'Retry-After': '60' }
        })
      }
    });
    await withServer(rateHandler, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/mcp`, { method: 'POST', headers: validHeaders });
      expect(response.status).toBe(429);
      expect(await response.json()).toEqual({ error: 'rate blocked' });
    });
  });

  it('rejects host, origin, endpoint, and bearer authentication failures', async () => {
    const cases = [
      {
        env: { MCP_HTTP_ALLOWED_HOSTS: 'allowed.example' },
        url: '/mcp',
        headers: validHeaders,
        status: 403
      },
      {
        env: { MCP_HTTP_ALLOWED_ORIGINS: 'https://allowed.example' },
        url: '/mcp',
        headers: validHeaders,
        status: 403
      },
      { env: {}, url: '/wrong', headers: validHeaders, status: 404 },
      {
        env: { MCP_HTTP_AUTH_MODE: 'bearer', MCP_HTTP_BEARER_TOKEN: 'secret' },
        url: '/mcp',
        headers: validHeaders,
        status: 401
      }
    ];

    for (const item of cases) {
      const handler = createHttpRequestHandler({
        config: parseHttpConfig(item.env),
        transport: { handleRequest: jest.fn() }
      });
      await withServer(handler, async (baseUrl) => {
        const response = await fetch(`${baseUrl}${item.url}`, {
          method: 'POST',
          headers: item.headers,
          body: '{}'
        });
        expect(response.status).toBe(item.status);
      });
    }
  });

  it('maps invalid JSON, oversized bodies, timeouts, and unexpected failures', async () => {
    const invalidJsonHandler = createHttpRequestHandler({
      config: parseHttpConfig({}),
      transport: { handleRequest: jest.fn() }
    });
    await withServer(invalidJsonHandler, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: validHeaders,
        body: '{'
      });
      expect(response.status).toBe(400);
    });

    const oversizedHandler = createHttpRequestHandler({
      config: parseHttpConfig({ MCP_HTTP_BODY_LIMIT_BYTES: '2' }),
      transport: { handleRequest: jest.fn() }
    });
    await withServer(oversizedHandler, async (baseUrl) => {
      await expect(
        fetch(`${baseUrl}/mcp`, {
          method: 'POST',
          headers: validHeaders,
          body: '{"a":1}'
        })
      ).rejects.toThrow('fetch failed');
    });

    for (const error of [new Error('operation timed out'), new Error('boom'), 'non-error']) {
      const handler = createHttpRequestHandler({
        config: parseHttpConfig({}),
        transport: {
          // Intentionally covers defensive handling of non-Error rejections.
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          handleRequest: () => Promise.reject(error)
        }
      });
      await withServer(handler, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/mcp`, {
          method: 'POST',
          headers: validHeaders,
          body: '{}'
        });
        expect(response.status).toBe(
          error instanceof Error && error.message.includes('timed out') ? 408 : 500
        );
        expect(response.headers.get('cache-control')).toBe('no-store');
      });
    }
  });
});
