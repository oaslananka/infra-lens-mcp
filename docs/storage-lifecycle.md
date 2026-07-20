# SQLite history lifecycle

`infra-lens-mcp` stores observations and explicit baselines in the SQLite database selected by `INFRA_LENS_DB`. The default path is `~/.infra-lens-mcp/metrics.db`.

## Schema migrations

The database uses both SQLite `PRAGMA user_version` and a named `schema_migrations` ledger. Migrations run transactionally when the database opens. A database created by a newer unsupported package version is rejected instead of being modified.

Current indexed access paths cover:

- host + observation classification + timestamp + row ID;
- host + label + timestamp + row ID;
- global timestamp pruning.

Timestamp and row ID form the stable pagination order, including when multiple samples have the same timestamp.

## Retention

`INFRA_LENS_RETENTION_DAYS` controls pruning:

- unset: keep 30 days;
- `0`: disable automatic pruning;
- `1` through `3650`: retain that many days.

Pruning runs inside the snapshot write transaction. Invalid values fail closed with a configuration error.

For long-term incident evidence, export records before the retention window expires or operate a separate backed-up archive database with retention disabled.

## Pagination

The `get_history` tool accepts:

- `limit`: 1–200, default 100;
- `cursor`: the opaque `next_cursor` from the previous page.

Responses include `has_more` and `next_cursor`. Cursors bind the original host, label stream, lower time bound, timestamp, and row ID. A cursor cannot be reused for another host or label.

## Export

Build the package, then export observations:

```bash
INFRA_LENS_DB=/srv/infra-lens/metrics.db \
node dist/export-history.js \
  --host app-01.internal \
  --hours 24 \
  --format ndjson \
  --output incident-app-01.ndjson
```

Named baseline stream:

```bash
node dist/export-history.js \
  --host app-01.internal \
  --hours 168 \
  --label weekday-normal \
  --format json \
  --output weekday-normal.json
```

Installed npm packages expose the same command as `infra-lens-export`. Output files are created with owner-only permissions when `--output` is used. Exported records include scalar metrics plus the stored redacted snapshot JSON; SSH credentials are never stored in SQLite.

## Backup and restore

For an online WAL database, use SQLite's backup command rather than copying only the main file:

```bash
sqlite3 /srv/infra-lens/metrics.db \
  ".backup '/srv/backups/infra-lens-$(date +%F).db'"
```

Verify the backup:

```bash
sqlite3 /srv/backups/infra-lens-2026-07-20.db \
  "PRAGMA integrity_check; SELECT version, name FROM schema_migrations ORDER BY version;"
```

Restore while the MCP process is stopped:

```bash
install -m 600 /srv/backups/infra-lens-2026-07-20.db /srv/infra-lens/metrics.db
```

Start the current package once to apply any pending migrations, then run a bounded `get_history` query. Keep the original database until the integrity check and application query both succeed.

## Cleanup and capacity checks

```bash
sqlite3 /srv/infra-lens/metrics.db \
  "SELECT classification, COUNT(*), MIN(timestamp), MAX(timestamp) FROM snapshots GROUP BY classification;"
```

After a large manual deletion, reclaim space during a maintenance window:

```bash
sqlite3 /srv/infra-lens/metrics.db "PRAGMA wal_checkpoint(TRUNCATE); VACUUM;"
```

`VACUUM` takes an exclusive operation window and requires free disk space. It is not part of the automatic write path.
