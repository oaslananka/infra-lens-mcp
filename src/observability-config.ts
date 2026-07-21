export interface OtlpMetricsConfig {
  endpoint: string;
  headers: Record<string, string>;
  timeoutMs: number;
  intervalMs: number;
  serviceName: string;
  resourceAttributes: Record<string, string>;
}

export interface ObservabilityConfig {
  enabled: boolean;
  host: string;
  port: number;
  path: string;
  maxAgeSeconds: number;
  allowRemote: boolean;
  otlp: OtlpMetricsConfig | null;
}

function parseBoolean(name: string, raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined || raw.trim() === '') return fallback;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new TypeError(`${name} must be true or false.`);
}

function parseInteger(
  name: string,
  raw: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new TypeError(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }
  return value;
}

export function parseKeyValueList(name: string, raw: string | undefined): Record<string, string> {
  if (!raw?.trim()) return {};
  const result: Record<string, string> = {};
  for (const item of raw.split(',')) {
    const separator = item.indexOf('=');
    if (separator <= 0)
      throw new TypeError(`${name} must contain comma-separated key=value pairs.`);
    try {
      const key = decodeURIComponent(item.slice(0, separator).trim());
      const value = decodeURIComponent(item.slice(separator + 1).trim());
      if (!key) throw new TypeError('empty key');
      result[key] = value;
    } catch (error) {
      throw new TypeError(`${name} contains invalid percent encoding.`, { cause: error });
    }
  }
  return result;
}

function resolveOtlpEndpoint(env: Record<string, string | undefined>): string | null {
  const signalEndpoint = env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT?.trim();
  const genericEndpoint = env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();
  const rawEndpoint = signalEndpoint || genericEndpoint;
  if (!rawEndpoint) return null;

  let endpoint: URL;
  try {
    endpoint = new URL(rawEndpoint);
  } catch (error) {
    throw new TypeError('OTLP metrics endpoint must be a valid URL.', { cause: error });
  }
  if (!['http:', 'https:'].includes(endpoint.protocol) || endpoint.username || endpoint.password) {
    throw new TypeError('OTLP metrics endpoint must use HTTP(S) without embedded credentials.');
  }
  if (!signalEndpoint) {
    endpoint.pathname = `${endpoint.pathname.replace(/\/$/, '')}/v1/metrics`;
  }
  return endpoint.toString();
}

function parseOtlpConfig(env: Record<string, string | undefined>): OtlpMetricsConfig | null {
  const endpoint = resolveOtlpEndpoint(env);
  if (!endpoint) return null;

  const protocol =
    env.OTEL_EXPORTER_OTLP_METRICS_PROTOCOL?.trim() ||
    env.OTEL_EXPORTER_OTLP_PROTOCOL?.trim() ||
    'http/json';
  if (protocol !== 'http/json') {
    throw new TypeError('OTLP metrics protocol must be http/json.');
  }

  return {
    endpoint,
    headers: parseKeyValueList(
      'OTEL_EXPORTER_OTLP_METRICS_HEADERS',
      env.OTEL_EXPORTER_OTLP_METRICS_HEADERS ?? env.OTEL_EXPORTER_OTLP_HEADERS
    ),
    timeoutMs: parseInteger(
      'OTEL_EXPORTER_OTLP_METRICS_TIMEOUT',
      env.OTEL_EXPORTER_OTLP_METRICS_TIMEOUT ?? env.OTEL_EXPORTER_OTLP_TIMEOUT,
      10_000,
      1,
      120_000
    ),
    intervalMs: parseInteger(
      'OTEL_METRIC_EXPORT_INTERVAL',
      env.OTEL_METRIC_EXPORT_INTERVAL,
      60_000,
      1_000,
      3_600_000
    ),
    serviceName: env.OTEL_SERVICE_NAME?.trim() || 'infra-lens-mcp',
    resourceAttributes: parseKeyValueList('OTEL_RESOURCE_ATTRIBUTES', env.OTEL_RESOURCE_ATTRIBUTES)
  };
}

export function parseObservabilityConfig(
  env: Record<string, string | undefined>
): ObservabilityConfig {
  const path = env.INFRA_LENS_METRICS_PATH?.trim() || '/metrics';
  if (!/^\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*$/.test(path)) {
    throw new TypeError(
      'INFRA_LENS_METRICS_PATH must be an absolute path without query or fragment.'
    );
  }

  return {
    enabled: parseBoolean(
      'INFRA_LENS_OBSERVABILITY_ENABLED',
      env.INFRA_LENS_OBSERVABILITY_ENABLED,
      false
    ),
    host: env.INFRA_LENS_METRICS_HOST?.trim() || '127.0.0.1',
    port: parseInteger('INFRA_LENS_METRICS_PORT', env.INFRA_LENS_METRICS_PORT, 9464, 1, 65_535),
    path,
    maxAgeSeconds: parseInteger(
      'INFRA_LENS_METRICS_MAX_AGE_SECONDS',
      env.INFRA_LENS_METRICS_MAX_AGE_SECONDS,
      300,
      1,
      86_400
    ),
    allowRemote: parseBoolean(
      'INFRA_LENS_METRICS_ALLOW_REMOTE',
      env.INFRA_LENS_METRICS_ALLOW_REMOTE,
      false
    ),
    otlp: parseOtlpConfig(env)
  };
}

function isLoopbackHost(host: string): boolean {
  return host === '127.0.0.1' || host === '::1' || host === 'localhost';
}

export function validateObservabilityConfig(config: ObservabilityConfig): void {
  if (!config.host) throw new TypeError('INFRA_LENS_METRICS_HOST must not be empty.');
  if (!isLoopbackHost(config.host) && !config.allowRemote) {
    throw new TypeError('Non-loopback metrics bind requires INFRA_LENS_METRICS_ALLOW_REMOTE=true.');
  }
}
