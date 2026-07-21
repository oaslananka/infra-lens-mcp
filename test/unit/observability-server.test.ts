import { describe, expect, it, jest } from '@jest/globals';
import { createServer } from 'node:http';
import { once } from 'node:events';

import {
  parseObservabilityConfig,
  validateObservabilityConfig
} from '../../src/observability-config.js';
import { createObservabilityRequestHandler } from '../../src/observability-server.js';
import type { MetricSnapshot } from '../../src/types.js';

const snapshot: MetricSnapshot = {
  timestamp: 1_700_000_000_000,
  host: 'metrics-host',
  cpu: { usage_percent: 20, load_1: 1, load_5: 1, load_15: 1, core_count: 2 },
  memory: {
    total_mb: 1024,
    used_mb: 512,
    free_mb: 512,
    usage_percent: 50,
    swap_used_mb: 0,
    swap_total_mb: 0
  },
  disk: [],
  network: [],
  system: { failed_units: 0, kernel_error_events: 0 },
  processes: [],
  os: { hostname: 'metrics-host', uptime_seconds: 100, kernel: 'x', distro: 'x' },
  warnings: []
};

async function withServer(
  handler: Parameters<typeof createServer>[0],
  run: (baseUrl: string) => Promise<void>
): Promise<void> {
  const server = createServer(handler);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected address.');
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

describe('observability configuration', () => {
  it('is disabled by default and uses loopback-safe defaults', () => {
    const config = parseObservabilityConfig({});
    expect(config).toMatchObject({
      enabled: false,
      host: '127.0.0.1',
      port: 9464,
      path: '/metrics',
      maxAgeSeconds: 300,
      allowRemote: false,
      otlp: null
    });
    expect(() => validateObservabilityConfig(config)).not.toThrow();
  });

  it('requires explicit remote opt-in and validates numeric/path bounds', () => {
    expect(() =>
      validateObservabilityConfig(
        parseObservabilityConfig({
          INFRA_LENS_OBSERVABILITY_ENABLED: 'true',
          INFRA_LENS_METRICS_HOST: '0.0.0.0'
        })
      )
    ).toThrow('ALLOW_REMOTE');

    expect(() => parseObservabilityConfig({ INFRA_LENS_METRICS_PORT: '0' })).toThrow('PORT');
    expect(() => parseObservabilityConfig({ INFRA_LENS_METRICS_PATH: 'metrics' })).toThrow('PATH');
    expect(() => parseObservabilityConfig({ INFRA_LENS_METRICS_MAX_AGE_SECONDS: '86401' })).toThrow(
      'MAX_AGE'
    );
    expect(() => parseObservabilityConfig({ INFRA_LENS_OBSERVABILITY_ENABLED: 'yes' })).toThrow(
      'ENABLED'
    );
  });

  it('parses optional standard OTLP settings without enabling them implicitly', () => {
    const config = parseObservabilityConfig({
      OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: 'https://collector.example/v1/metrics',
      OTEL_EXPORTER_OTLP_METRICS_HEADERS: 'authorization=Bearer%20token,x-tenant=infra',
      OTEL_EXPORTER_OTLP_METRICS_TIMEOUT: '12000',
      OTEL_METRIC_EXPORT_INTERVAL: '30000',
      OTEL_SERVICE_NAME: 'infra-lens-observer',
      OTEL_RESOURCE_ATTRIBUTES: 'deployment.environment=prod,service.namespace=ops'
    });

    expect(config.enabled).toBe(false);
    expect(config.otlp).toMatchObject({
      endpoint: 'https://collector.example/v1/metrics',
      timeoutMs: 12000,
      intervalMs: 30000,
      serviceName: 'infra-lens-observer',
      headers: { authorization: 'Bearer token', 'x-tenant': 'infra' },
      resourceAttributes: {
        'deployment.environment': 'prod',
        'service.namespace': 'ops'
      }
    });
  });
});

describe('observability scrape handler', () => {
  const config = parseObservabilityConfig({ INFRA_LENS_OBSERVABILITY_ENABLED: 'true' });

  it('serves GET and HEAD with OpenMetrics security headers', async () => {
    const readLatest = jest.fn(() => ({ snapshots: [snapshot], invalidRows: 0 }));
    const handler = createObservabilityRequestHandler({
      config,
      readLatest,
      now: () => 1_700_000_010_000
    });

    await withServer(handler, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/metrics`);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe(
        'application/openmetrics-text; version=1.0.0; charset=utf-8'
      );
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(await response.text()).toContain('infra_lens_cpu_usage_percent');

      const head = await fetch(`${baseUrl}/metrics`, { method: 'HEAD' });
      expect(head.status).toBe(200);
      expect(await head.text()).toBe('');
    });
    expect(readLatest).toHaveBeenCalledTimes(2);
  });

  it('rejects unsupported paths and methods before reading SQLite', async () => {
    const readLatest = jest.fn(() => ({ snapshots: [snapshot], invalidRows: 0 }));
    const handler = createObservabilityRequestHandler({ config, readLatest });

    await withServer(handler, async (baseUrl) => {
      expect((await fetch(`${baseUrl}/other`)).status).toBe(404);
      const post = await fetch(`${baseUrl}/metrics`, { method: 'POST' });
      expect(post.status).toBe(405);
      expect(post.headers.get('allow')).toBe('GET, HEAD');
    });
    expect(readLatest).not.toHaveBeenCalled();
  });

  it('sanitizes database read failures', async () => {
    const handler = createObservabilityRequestHandler({
      config,
      readLatest: () => {
        throw new Error('secret database path');
      }
    });

    await withServer(handler, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/metrics`);
      expect(response.status).toBe(500);
      expect(await response.text()).toBe('Metrics unavailable.\n');
    });
  });
});
