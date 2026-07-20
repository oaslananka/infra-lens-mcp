# ADR 0003: SQLite Snapshot History

- Status: Accepted
- Date: 2026-05-26
- Owners: maintainers

## Context

The tools need local history for baselines, trend questions, and comparisons against known healthy windows. The package should run from `npx`, Docker, or a desktop MCP client without requiring a separate database service. Stored history must not contain SSH credentials.

## Decision

Store metric snapshots in a local SQLite database managed by `better-sqlite3`. The default path is under the user's home directory and can be overridden with `INFRA_LENS_DB`. Persist only metric fields and raw metric JSON needed for analysis. Do not store SSH credentials, tokens, private keys, passphrases, or auth cookies.

Every persisted row is classified as either an `observation` or a `baseline`. `snapshot` and `analyze_server` create observations; only `record_baseline` creates approved baseline samples. Analysis reads baseline rows before the current observation is persisted, so an incident cannot influence its own comparison. Unlabeled history returns observations, while an explicit label can inspect a named record stream.

## Consequences

- Positive: Operators get history and baselines without deploying infrastructure.
- Positive: SQLite keeps the package portable across local, Docker, and CI smoke scenarios.
- Positive: The schema is small enough to inspect and migrate deliberately.
- Positive: Incident observations cannot normalize themselves into the healthy baseline.
- Negative: SQLite is not intended as a shared multi-writer telemetry store.
- Negative: Legacy `default` rows are ambiguous; schema version 1 conservatively migrates them to `observation`, while named legacy rows migrate to `baseline`. Operators should re-record a healthy default baseline after upgrade.
- Follow-up: Broader retention, pagination, and migration governance remains tracked separately.

## Alternatives Considered

| Option | Pros | Cons | Fit |
| --- | --- | --- | --- |
| Local SQLite | Zero external service, durable local history, simple packaging | Not a distributed telemetry backend | High |
| In-memory history only | No disk writes and simplest runtime | Baselines disappear on restart and trend tools lose value | Low |
| External database | Scales beyond one local operator | Adds deployment burden and credential management to a local MCP package | Low |
