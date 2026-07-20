import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';

import { isMainModule } from '../../src/entrypoint.js';
import { startStdioRuntime } from '../../src/mcp.js';
import { createHttpRequestHandler, startHttpRuntime } from '../../src/server-http.js';
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
