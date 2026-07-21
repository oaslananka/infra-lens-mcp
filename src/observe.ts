import { createServer, type RequestListener, type Server } from 'node:http';

import { getLatestObservationSnapshots, type LatestObservationSnapshots } from './baseline.js';
import { isMainModule } from './entrypoint.js';
import { createLogger } from './logging.js';
import {
  parseObservabilityConfig,
  validateObservabilityConfig,
  type ObservabilityConfig
} from './observability-config.js';
import { buildLatestMetricPoints } from './observability-metrics.js';
import { createObservabilityRequestHandler } from './observability-server.js';
import { exportOtlpMetrics, type ExportOtlpMetricsOptions } from './otlp-metrics.js';

const logger = createLogger('observe');

export type HttpServer = Server;

interface SignalRegistrar {
  once(signal: 'SIGTERM' | 'SIGINT', listener: () => void): unknown;
}

export interface ObservabilityRuntimeDependencies {
  env?: Record<string, string | undefined>;
  createServer?: (handler: RequestListener) => HttpServer;
  readLatest?: () => LatestObservationSnapshots;
  exportMetrics?: (options: ExportOtlpMetricsOptions) => Promise<void>;
  now?: () => number;
  setInterval?: (callback: () => void, intervalMs: number) => NodeJS.Timeout;
  clearInterval?: (timer: NodeJS.Timeout) => void;
  signals?: SignalRegistrar;
  exit?: (code: number) => void;
  logListening?: (message: string) => void;
  logError?: (message: string) => void;
}

export interface ObservabilityRuntime {
  config: ObservabilityConfig;
  httpServer: HttpServer;
  interval: NodeJS.Timeout | null;
}

export function createObservabilityShutdownHandler(
  httpServer: HttpServer,
  interval: NodeJS.Timeout | null,
  clearTimer: (timer: NodeJS.Timeout) => void = clearInterval,
  exit: (code: number) => void = (code) => process.exit(code),
  timeoutMs = 10_000
): (signal: string) => void {
  let shuttingDown = false;
  let settled = false;

  const settle = (code: number): void => {
    if (settled) return;
    settled = true;
    exit(code);
  };

  return (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Received ${signal}, shutting down`);
    if (interval) clearTimer(interval);

    const timeout = setTimeout(() => settle(1), timeoutMs);
    timeout.unref();
    httpServer.close((error) => {
      clearTimeout(timeout);
      settle(error ? 1 : 0);
    });
  };
}

export async function startObservabilityRuntime(
  dependencies: ObservabilityRuntimeDependencies = {}
): Promise<ObservabilityRuntime> {
  const config = parseObservabilityConfig(dependencies.env ?? process.env);
  if (!config.enabled) {
    throw new Error(
      'Observability exports are disabled. Set INFRA_LENS_OBSERVABILITY_ENABLED=true.'
    );
  }
  validateObservabilityConfig(config);

  const readLatest = dependencies.readLatest ?? getLatestObservationSnapshots;
  const now = dependencies.now ?? Date.now;
  const handler = createObservabilityRequestHandler({ config, readLatest, now });
  const httpServer = (dependencies.createServer ?? createServer)(handler);
  await new Promise<void>((resolve) => httpServer.listen(config.port, config.host, resolve));

  const listening = `infra-lens-observe listening on http://${config.host}:${config.port}${config.path}`;
  (dependencies.logListening ?? ((message) => logger.info(message)))(listening);

  const runOtlpExport = async (): Promise<void> => {
    if (!config.otlp) return;
    try {
      const latest = readLatest();
      const points = buildLatestMetricPoints(latest.snapshots, {
        now: now(),
        maxAgeSeconds: config.maxAgeSeconds,
        invalidRows: latest.invalidRows
      });
      await (dependencies.exportMetrics ?? exportOtlpMetrics)({ config: config.otlp, points });
    } catch {
      (dependencies.logError ?? ((message) => logger.error(message)))(
        'OTLP metrics export failed.'
      );
    }
  };

  let interval: NodeJS.Timeout | null = null;
  if (config.otlp) {
    void runOtlpExport();
    interval = (dependencies.setInterval ?? setInterval)(
      () => void runOtlpExport(),
      config.otlp.intervalMs
    );
    interval.unref();
  }

  const shutdown = createObservabilityShutdownHandler(
    httpServer,
    interval,
    dependencies.clearInterval,
    dependencies.exit
  );
  const signals = dependencies.signals ?? process;
  signals.once('SIGTERM', () => shutdown('SIGTERM'));
  signals.once('SIGINT', () => shutdown('SIGINT'));

  return { config, httpServer, interval };
}

/* istanbul ignore next -- exercised by black-box process tests */
if (isMainModule(import.meta.url)) {
  try {
    await startObservabilityRuntime();
  } catch {
    logger.error('Observability runtime failed to start.');
    process.exit(1);
  }
}
