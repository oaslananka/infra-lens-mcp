import type { OtlpMetricsConfig } from './observability-config.js';
import type { MetricPoint } from './observability-metrics.js';
import { getPackageVersion } from './version.js';

interface OtlpKeyValue {
  key: string;
  value: { stringValue: string };
}

interface OtlpNumberDataPoint {
  attributes: OtlpKeyValue[];
  timeUnixNano: string;
  asDouble: number;
}

interface OtlpMetric {
  name: string;
  description: string;
  unit: string;
  gauge: { dataPoints: OtlpNumberDataPoint[] };
}

export interface OtlpMetricsRequest {
  resourceMetrics: Array<{
    resource: { attributes: OtlpKeyValue[] };
    scopeMetrics: Array<{
      scope: { name: string; version: string };
      metrics: OtlpMetric[];
    }>;
  }>;
}

function attributes(values: Record<string, string>): OtlpKeyValue[] {
  return Object.entries(values)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => ({ key, value: { stringValue: value } }));
}

function timeUnixNano(timestampMs: number): string {
  return (BigInt(Math.trunc(timestampMs)) * 1_000_000n).toString();
}

export function buildOtlpMetricsRequest(
  points: MetricPoint[],
  config: Pick<OtlpMetricsConfig, 'serviceName' | 'resourceAttributes'>
): OtlpMetricsRequest {
  const grouped = new Map<string, OtlpMetric>();
  for (const point of points) {
    let metric = grouped.get(point.name);
    if (!metric) {
      metric = {
        name: point.name,
        description: point.help,
        unit: '1',
        gauge: { dataPoints: [] }
      };
      grouped.set(point.name, metric);
    }
    metric.gauge.dataPoints.push({
      attributes: attributes(point.labels),
      timeUnixNano: timeUnixNano(point.timestampMs),
      asDouble: point.value
    });
  }

  const resourceAttributes = {
    ...config.resourceAttributes,
    'service.name': config.serviceName
  };
  return {
    resourceMetrics: [
      {
        resource: { attributes: attributes(resourceAttributes) },
        scopeMetrics: [
          {
            scope: { name: 'infra-lens-mcp', version: getPackageVersion() },
            metrics: [...grouped.values()].sort((left, right) =>
              left.name.localeCompare(right.name)
            )
          }
        ]
      }
    ]
  };
}

export interface ExportOtlpMetricsOptions {
  config: OtlpMetricsConfig;
  points: MetricPoint[];
  fetchImpl?: typeof fetch;
}

export async function exportOtlpMetrics({
  config,
  points,
  fetchImpl = fetch
}: ExportOtlpMetricsOptions): Promise<void> {
  const headers = new Headers(config.headers);
  headers.set('content-type', 'application/json');
  headers.set('user-agent', `infra-lens-mcp/${getPackageVersion()}`);

  const response = await fetchImpl(config.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(buildOtlpMetricsRequest(points, config)),
    signal: AbortSignal.timeout(config.timeoutMs)
  });
  if (!response.ok) {
    throw new Error(`OTLP metrics export failed with HTTP ${response.status}.`);
  }
}
