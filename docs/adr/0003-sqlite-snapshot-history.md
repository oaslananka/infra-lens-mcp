# ADR 0003: SQLite Snapshot History

- Status: Accepted
- Date: 2026-05-26
- Owners: maintainers

## Context

The tools need local history for baselines, trend questions, and comparisons against known healthy windows. The package should run from `npx`, Docker, or a desktop MCP client without requiring a separate database service. Stored history must not contain SSH credentials.

## Decision

Store metric snapshots in a local SQLite database managed by `better-sqlite3`. The default path is under the user's home directory and can be overridden with `INFRA_LENS_DB`. Persist only metric fields and raw metric JSON needed for analysis. Do not store SSH credentials, tokens, private keys, passphrases, or auth cookies.

## Consequences

- Positive: Operators get history and baselines without deploying infrastructure.
- Positive: SQLite keeps the package portable across local, Docker, and CI smoke scenarios.
- Positive: The schema is small enough to inspect and migrate deliberately.
- Negative: SQLite is not intended as a shared multi-writer telemetry store.
- Follow-up: Add migrations only when schema changes are required and keep release notes explicit.

## Alternatives Considered

| Option | Pros | Cons | Fit |
| --- | --- | --- | --- |
| Local SQLite | Zero external service, durable local history, simple packaging | Not a distributed telemetry backend | High |
| In-memory history only | No disk writes and simplest runtime | Baselines disappear on restart and trend tools lose value | Low |
| External database | Scales beyond one local operator | Adds deployment burden and credential management to a local MCP package | Low |
