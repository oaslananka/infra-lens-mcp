import { describe, expect, it, jest } from '@jest/globals';

import { buildOtlpMetricsRequest, exportOtlpMetrics } from '../../src/otlp-metrics.js';
import type { OtlpMetricsConfig } from '../../src/observability-config.js';
import type { MetricPoint } from '../../src/observability-metrics.js';

const points: MetricPoint[] = [
  {
    name: 'infra_lens_cpu_usage_percent',
    help: 'CPU usage.',
    value: 42,
    labels: { host: 'alpha' },
    timestampMs: 1_700_000_000_123
  },
  {
    name: 'infra_lens_cpu_usage_percent',
    help: 'CPU usage.',
    value: 7,
    labels: { host: 'beta' },
    timestampMs: 1_700_000_000_456
  }
];

const config: OtlpMetricsConfig = {
  endpoint: 'https://collector.example/v1/metrics',
  headers: { authorization: 'Bearer token' },
  timeoutMs: 1000,
  intervalMs: 60_000,
  serviceName: 'infra-lens-observer',
  resourceAttributes: { 'deployment.environment': 'test' }
};

describe('OTLP metrics export', () => {
  it('encodes gauges with resource attributes and nanosecond timestamps', () => {
    const request = buildOtlpMetricsRequest(points, config);
    const resource = request.resourceMetrics[0];
    const metrics = resource?.scopeMetrics[0]?.metrics;

    expect(resource?.resource.attributes).toEqual(
      expect.arrayContaining([
        { key: 'service.name', value: { stringValue: 'infra-lens-observer' } },
        { key: 'deployment.environment', value: { stringValue: 'test' } }
      ])
    );
    expect(metrics).toHaveLength(1);
    expect(metrics?.[0]).toMatchObject({
      name: 'infra_lens_cpu_usage_percent',
      description: 'CPU usage.',
      gauge: {
        dataPoints: expect.arrayContaining([
          expect.objectContaining({
            timeUnixNano: '1700000000123000000',
            asDouble: 42,
            attributes: [{ key: 'host', value: { stringValue: 'alpha' } }]
          })
        ])
      }
    });
  });

  it('posts JSON with explicit identity and configured headers', async () => {
    const fetchImpl = jest.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 200 }));

    await exportOtlpMetrics({ config, points, fetchImpl });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe(config.endpoint);
    expect(init).toMatchObject({ method: 'POST' });
    expect(new Headers(init?.headers).get('content-type')).toBe('application/json');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer token');
    expect(new Headers(init?.headers).get('user-agent')).toMatch(/^infra-lens-mcp\//);
    if (typeof init?.body !== 'string') throw new Error('Expected string OTLP body.');
    expect(JSON.parse(init.body)).toMatchObject({ resourceMetrics: expect.any(Array) });
  });

  it('fails closed on non-success responses without including response content', async () => {
    const fetchImpl = jest
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('collector secret', { status: 503 }));

    await expect(exportOtlpMetrics({ config, points, fetchImpl })).rejects.toThrow(
      'OTLP metrics export failed with HTTP 503.'
    );
    await expect(exportOtlpMetrics({ config, points, fetchImpl })).rejects.not.toThrow(
      'collector secret'
    );
  });

  it('aborts exports at the configured timeout', async () => {
    const fetchImpl: typeof fetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener(
          'abort',
          () =>
            reject(
              init.signal?.reason instanceof Error
                ? init.signal.reason
                : new Error('OTLP request aborted.')
            ),
          { once: true }
        );
      });

    await expect(
      exportOtlpMetrics({ config: { ...config, timeoutMs: 5 }, points, fetchImpl })
    ).rejects.toBeDefined();
  });
});
