import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { createHttpShutdownHandler, createStdioShutdownHandler } from '../../src/shutdown.js';

afterEach(() => {
  jest.useRealTimers();
});

describe('shutdown handlers', () => {
  it('closes the stdio server and exits cleanly', async () => {
    const close = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const exit = jest.fn<(code: number) => void>();
    const shutdown = createStdioShutdownHandler({ close }, exit);

    shutdown('SIGINT');
    await Promise.resolve();

    expect(close).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('returns exit code 1 when stdio shutdown fails', async () => {
    const close = jest.fn<() => Promise<void>>().mockRejectedValue(new Error('close failed'));
    const exit = jest.fn<(code: number) => void>();
    const shutdown = createStdioShutdownHandler({ close }, exit);

    shutdown('SIGTERM');
    await Promise.resolve();

    expect(exit).toHaveBeenCalledWith(1);
  });

  it('closes the HTTP server and transport before exiting', async () => {
    const transportClose = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const exit = jest.fn<(code: number) => void>();
    const httpServer = {
      close(callback: () => void) {
        callback();
        return this;
      }
    };

    const shutdown = createHttpShutdownHandler(
      httpServer as never,
      { close: transportClose },
      exit,
      10_000
    );

    shutdown('SIGTERM');
    await Promise.resolve();

    expect(transportClose).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('returns exit code 1 when the HTTP transport close fails', async () => {
    const exit = jest.fn<(code: number) => void>();
    const httpServer = {
      close(callback: () => void) {
        callback();
        return this;
      }
    };

    const shutdown = createHttpShutdownHandler(
      httpServer as never,
      {
        close: jest.fn<() => Promise<void>>().mockRejectedValue(new Error('transport close failed'))
      },
      exit,
      10_000
    );

    shutdown('SIGTERM');
    await Promise.resolve();

    expect(exit).toHaveBeenCalledWith(1);
  });

  it('ignores duplicate stdio shutdown signals while close is in flight', async () => {
    let resolveClose: (() => void) | undefined;
    const close = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveClose = resolve;
        })
    );
    const exit = jest.fn<(code: number) => void>();
    const shutdown = createStdioShutdownHandler({ close }, exit);

    shutdown('SIGINT');
    shutdown('SIGTERM');
    resolveClose?.();
    await Promise.resolve();

    expect(close).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('does not exit twice when an HTTP close callback arrives after timeout', async () => {
    jest.useFakeTimers();
    let closeCallback: (() => void) | undefined;
    const exit = jest.fn<(code: number) => void>();
    const httpServer = {
      close(callback: () => void) {
        closeCallback = callback;
        return this;
      }
    };
    const transportClose = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const shutdown = createHttpShutdownHandler(
      httpServer as never,
      { close: transportClose },
      exit,
      50
    );

    shutdown('SIGTERM');
    jest.advanceTimersByTime(50);
    closeCallback?.();
    await Promise.resolve();

    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
    expect(transportClose).not.toHaveBeenCalled();
  });

  it('ignores duplicate HTTP shutdown signals while close is in flight', async () => {
    let closeCallback: (() => void) | undefined;
    const exit = jest.fn<(code: number) => void>();
    const httpServer = {
      close(callback: () => void) {
        closeCallback = callback;
        return this;
      }
    };
    const transportClose = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const shutdown = createHttpShutdownHandler(
      httpServer as never,
      { close: transportClose },
      exit,
      10_000
    );

    shutdown('SIGTERM');
    shutdown('SIGINT');
    closeCallback?.();
    await Promise.resolve();

    expect(transportClose).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('supports default process exit handlers and an optional HTTP transport close', async () => {
    const processExit = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const stdioShutdown = createStdioShutdownHandler({ close: () => undefined });
    const httpServer = {
      close(callback: () => void) {
        callback();
        return this;
      }
    };
    const httpShutdown = createHttpShutdownHandler(httpServer as never, {});

    stdioShutdown('SIGTERM');
    httpShutdown('SIGTERM');
    await Promise.resolve();

    expect(processExit).toHaveBeenCalledTimes(2);
    expect(processExit).toHaveBeenNthCalledWith(1, 0);
    expect(processExit).toHaveBeenNthCalledWith(2, 0);
    processExit.mockRestore();
  });

  it('forces an HTTP shutdown timeout when the server does not close', () => {
    jest.useFakeTimers();

    const exit = jest.fn<(code: number) => void>();
    const httpServer = {
      close() {
        return this;
      }
    };

    const shutdown = createHttpShutdownHandler(httpServer as never, {}, exit, 50);
    shutdown('SIGTERM');
    jest.advanceTimersByTime(50);

    expect(exit).toHaveBeenCalledWith(1);
  });
});
