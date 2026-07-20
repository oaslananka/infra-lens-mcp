import type { Server as HttpServer } from 'node:http';

import { createLogger } from './logging.js';

export interface AsyncCloseable {
  close(): Promise<void> | void;
}

export interface HttpTransportLike {
  close?(): Promise<void> | void;
}

type ExitHandler = (code: number) => void;

const stdioLogger = createLogger('mcp');
const httpLogger = createLogger('server-http');

export function createStdioShutdownHandler(
  server: AsyncCloseable,
  exit: ExitHandler = (code) => process.exit(code)
): (signal: string) => void {
  let shuttingDown = false;

  return (signal: string) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    stdioLogger.info(`Received ${signal}, shutting down`);
    Promise.resolve(server.close()).then(
      () => exit(0),
      () => exit(1)
    );
  };
}

export function createHttpShutdownHandler(
  httpServer: HttpServer,
  transport: HttpTransportLike,
  exit: ExitHandler = (code) => process.exit(code),
  timeoutMs = 10_000
): (signal: string) => void {
  let shuttingDown = false;
  let settled = false;

  const settle = (code: number): void => {
    if (settled) {
      return;
    }
    settled = true;
    exit(code);
  };

  return (signal: string) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    httpLogger.info(`Received ${signal}, shutting down`);

    const timeout = setTimeout(() => {
      settle(1);
    }, timeoutMs);
    timeout.unref();

    httpServer.close(() => {
      clearTimeout(timeout);
      if (settled) {
        return;
      }
      Promise.resolve(transport.close?.()).then(
        () => settle(0),
        () => settle(1)
      );
    });
  };
}
