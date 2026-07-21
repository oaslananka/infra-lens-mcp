# Observability exports

`infra-lens-observe` exposes the latest persisted observation for every host without starting SSH sessions or changing MCP request handling. The process is disabled unless `INFRA_LENS_OBSERVABILITY_ENABLED=true`.

## Prometheus and OpenMetrics

Start a loopback-only OpenMetrics 1.0 endpoint:

```bash
INFRA_LENS_OBSERVABILITY_ENABLED=true \
INFRA_LENS_DB="$HOME/.infra-lens-mcp/metrics.db" \
infra-lens-observe
```

The default endpoint is `http://127.0.0.1:9464/metrics`.

Example Prometheus scrape configuration:

```yaml
scrape_configs:
  - job_name: infra-lens
    metrics_path: /metrics
    static_configs:
      - targets: ['127.0.0.1:9464']
```

Configuration:

| Variable | Default | Purpose |
| --- | --- | --- |
| `INFRA_LENS_OBSERVABILITY_ENABLED` | `false` | Required explicit activation |
| `INFRA_LENS_METRICS_HOST` | `127.0.0.1` | Listener address |
| `INFRA_LENS_METRICS_PORT` | `9464` | Listener port |
| `INFRA_LENS_METRICS_PATH` | `/metrics` | Exact scrape path |
| `INFRA_LENS_METRICS_MAX_AGE_SECONDS` | `300` | Freshness threshold |
| `INFRA_LENS_METRICS_ALLOW_REMOTE` | `false` | Required for non-loopback bind |

The endpoint uses `application/openmetrics-text; version=1.0.0; charset=utf-8`, supports GET and HEAD, sets `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`, and does not emit explicit sample timestamps.

## OpenTelemetry OTLP/HTTP JSON

Set a signal-specific endpoint:

```bash
INFRA_LENS_OBSERVABILITY_ENABLED=true \
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=https://collector.example/v1/metrics \
OTEL_EXPORTER_OTLP_METRICS_PROTOCOL=http/json \
OTEL_EXPORTER_OTLP_METRICS_HEADERS='authorization=Bearer%20REDACTED' \
OTEL_SERVICE_NAME=infra-lens-observer \
infra-lens-observe
```

The global `OTEL_EXPORTER_OTLP_ENDPOINT` is also supported and receives the standard `/v1/metrics` suffix. Signal-specific endpoint, headers, timeout, and protocol values override global values.

Supported variables:

- `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` or `OTEL_EXPORTER_OTLP_ENDPOINT`
- `OTEL_EXPORTER_OTLP_METRICS_HEADERS` or `OTEL_EXPORTER_OTLP_HEADERS`
- `OTEL_EXPORTER_OTLP_METRICS_TIMEOUT` or `OTEL_EXPORTER_OTLP_TIMEOUT`
- `OTEL_EXPORTER_OTLP_METRICS_PROTOCOL` or `OTEL_EXPORTER_OTLP_PROTOCOL`; only `http/json`
- `OTEL_METRIC_EXPORT_INTERVAL`, default 60000 ms
- `OTEL_SERVICE_NAME`, default `infra-lens-mcp`
- `OTEL_RESOURCE_ATTRIBUTES`

One export runs immediately and later exports run at the configured interval. A failed export is logged generically and retried on the next interval; response content and configured headers are never logged.

## Metric and privacy contract

The exporter exposes CPU, memory, swap, disk, inode, network sample deltas, service failures, bounded kernel-event counts, uptime, snapshot age/freshness, and valid/invalid latest-row counts.

Labels are limited to host, mountpoint, interface, direction, period, and state. Process names and commands, warnings, kernel/distribution strings, SSH credentials, and OTLP headers are not exported. Hostnames, mountpoints, interface names, and operational values are still sensitive infrastructure data.

## Deployment security

Keep the listener on loopback or a private network. A non-loopback bind requires `INFRA_LENS_METRICS_ALLOW_REMOTE=true`, but that flag does not provide authentication or TLS. Put an authenticated TLS reverse proxy in front of remote scrape access and block direct access to the Node process.

Use HTTPS for OTLP across untrusted networks. Plain HTTP is intended only for loopback or a protected private collector path. Scope collector credentials narrowly and inject them through runtime secret management rather than committed environment files.

The implementation follows the Prometheus/OpenMetrics exposition requirements and the stable OpenTelemetry OTLP exporter configuration model:

- https://prometheus.io/docs/instrumenting/exposition_formats/
- https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
