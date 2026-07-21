# Observability Exports Design

## Goal

Expose the latest persisted infrastructure snapshots to monitoring pipelines without coupling observability to MCP request handling or enabling a listener by default.

## Architecture

A standalone `infra-lens-observe` process reads the existing SQLite database. It never initiates SSH collection. When `INFRA_LENS_OBSERVABILITY_ENABLED=true`, it serves OpenMetrics on loopback and optionally pushes the same bounded metric set through OTLP/HTTP JSON.

This remains separate from the MCP HTTP transport because scrape exposure, authentication, and availability are operationally distinct from MCP OAuth/bearer controls.

## Data and metrics

`getLatestObservationSnapshots()` returns one observation per host, excludes baselines, sorts by host, and skips/counts invalid historical JSON. Exported gauges use the `infra_lens_` prefix and bounded `host`, `mountpoint`, `interface`, `direction`, `period`, `state` labels. Processes, commands, warnings, kernel, distro, and credentials are never exported.

The contract covers snapshot time/age/freshness, CPU usage/load/cores, memory/swap bytes and percentages, disk/inode metrics, network byte/packet/error/drop deltas, failed units, bounded kernel events, uptime, and valid/invalid row counts.

OpenMetrics uses `application/openmetrics-text; version=1.0.0; charset=utf-8`, no explicit sample timestamps, escaped labels, and final `# EOF`.

## Configuration and safety

Startup requires `INFRA_LENS_OBSERVABILITY_ENABLED=true`. Defaults are `127.0.0.1:9464`, path `/metrics`, and max snapshot age 300 seconds. Non-loopback bind additionally requires `INFRA_LENS_METRICS_ALLOW_REMOTE=true`. TLS/auth are delegated to a private path or reverse proxy. Responses use `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`.

Optional OTLP configuration follows `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`, `OTEL_EXPORTER_OTLP_METRICS_HEADERS`, `OTEL_EXPORTER_OTLP_METRICS_TIMEOUT`, `OTEL_METRIC_EXPORT_INTERVAL`, `OTEL_SERVICE_NAME`, and `OTEL_RESOURCE_ATTRIBUTES`. Only HTTP(S) endpoints are accepted. Export errors are logged and retried only on the next interval.

## Lifecycle and testing

The runtime starts the scrape server, performs one immediate OTLP export when configured, schedules an unrefed interval, and handles idempotent SIGINT/SIGTERM shutdown. Unit tests cover query/config/format/OTLP/server/lifecycle behavior; a child-process integration test seeds SQLite, scrapes the real entrypoint, and verifies SIGTERM exit.
