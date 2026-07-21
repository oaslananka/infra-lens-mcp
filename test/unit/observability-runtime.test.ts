import { describe, expect, it, jest } from '@jest/globals';

import {
  createObservabilityShutdownHandler,
  startObservabilityRuntime
} from '../../src/observe.js';
import type { HttpServer } from '../../src/observe.js';

function fakeHttpServer() {
  const server = {
    listen: jest.fn((_port: number, _host: string, callback: () => void) => {
      callback();
      return server;
    }),
    close: jest.fn((callback: (error?: Error) => void) => {
      callback();
      return server;
    })
  };
  return server;
}

describe('observability runtime', () => {
  it('refuses to start while exports are disabled', async () => {
    await expect(
      startObservabilityRuntime({ env: {}, createServer: () => fakeHttpServer() as never })
    ).rejects.toThrow('disabled');
  });

  it('starts loopback scrape service and registers idempotent shutdown', async () => {
    const server = fakeHttpServer();
    const handlers = new Map<string, () => void>();
    const signals = {
      once(signal: string, handler: () => void) {
        handlers.set(signal, handler);
        return this;
      }
    };
    const exit = jest.fn<(code: number) => void>();
    const clearInterval = jest.fn<(timer: NodeJS.Timeout) => void>();

    const runtime = await startObservabilityRuntime({
      env: { INFRA_LENS_OBSERVABILITY_ENABLED: 'true', INFRA_LENS_METRICS_PORT: '9555' },
      createServer: () => server as never,
      signals,
      exit,
      clearInterval,
      logListening: jest.fn()
    });

    expect(runtime.config.port).toBe(9555);
    expect(server.listen).toHaveBeenCalledWith(9555, '127.0.0.1', expect.any(Function));
    expect(runtime.interval).toBeNull();
    handlers.get('SIGTERM')?.();
    handlers.get('SIGINT')?.();
    expect(server.close).toHaveBeenCalledTimes(1);
    expect(clearInterval).not.toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('runs immediate and periodic OTLP exports without keeping the process alive', async () => {
    const server = fakeHttpServer();
    const unref = jest.fn();
    let scheduled: (() => void) | undefined;
    const timer = { unref } as unknown as NodeJS.Timeout;
    const setInterval = jest.fn((callback: () => void, _intervalMs: number) => {
      scheduled = callback;
      return timer;
    });
    const exportMetrics = jest.fn<() => Promise<void>>().mockRejectedValue(new Error('offline'));
    const logError = jest.fn<(message: string) => void>();

    const runtime = await startObservabilityRuntime({
      env: {
        INFRA_LENS_OBSERVABILITY_ENABLED: 'true',
        OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: 'http://127.0.0.1:4318/v1/metrics',
        OTEL_METRIC_EXPORT_INTERVAL: '1000'
      },
      createServer: () => server as never,
      readLatest: () => ({ snapshots: [], invalidRows: 0 }),
      exportMetrics,
      setInterval,
      signals: { once: jest.fn() },
      exit: jest.fn(),
      logListening: jest.fn(),
      logError
    });

    await Promise.resolve();
    expect(exportMetrics).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledWith('OTLP metrics export failed.');
    expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 1000);
    expect(unref).toHaveBeenCalledTimes(1);
    scheduled?.();
    await Promise.resolve();
    expect(exportMetrics).toHaveBeenCalledTimes(2);
    expect(runtime.interval).toBe(timer);
  });

  it('settles shutdown once when close reports an error', () => {
    const server = {
      close(callback: (error?: Error) => void) {
        callback(new Error('close failed'));
        return this;
      }
    } as unknown as HttpServer;
    const exit = jest.fn<(code: number) => void>();
    const shutdown = createObservabilityShutdownHandler(server, null, jest.fn(), exit);

    shutdown('SIGTERM');
    shutdown('SIGINT');

    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
  });
});
