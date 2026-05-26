# Architecture

## Component map

Architecture decision records live in [docs/adr](./adr/README.md).

```text
MCP client
  | stdio or Streamable HTTP
  v
src/mcp.ts / src/server-http.ts
  |
  +-- src/http-security.ts  HTTP host/origin/auth/body-limit policy
  +-- src/server-core.ts    MCP tool registration and handlers
  +-- src/collector.ts      SSH metric collection and parsing
  +-- src/analyzer.ts       Threshold and z-score anomaly analysis
  +-- src/baseline.ts       SQLite snapshot persistence and history
  +-- src/db.ts             SQLite connection and schema setup
  +-- src/ssh.ts            SSH sessions and strict host verification
  +-- src/logging.ts        Structured stderr logging and redaction
  +-- src/types.ts          Zod schemas and shared TypeScript types
```

## Data flow

1. The MCP client calls a tool such as `analyze_server`.
2. `server-core.ts` validates input with Zod. In remote-safe profiles, raw SSH credential fields are omitted from the schema.
3. `collector.ts` opens an SSH session through `ssh.ts`.
4. `ssh.ts` verifies the remote host key by pinned SHA256 fingerprint or `known_hosts` before the connection is accepted.
5. `collector.ts` gathers CPU from `/proc/stat` deltas, memory pressure from available memory, disk usage, optional network metrics, optional process metrics, and OS metadata.
6. `baseline.ts` persists snapshots in SQLite without SSH credentials.
7. `analyzer.ts` loads baseline samples and returns anomalies, explanations, and recommendations.
8. Tool responses are JSON text payloads returned through MCP.

## HTTP transport

`server-http.ts` uses the MCP SDK Streamable HTTP transport and a local request policy layer:

- loopback bind by default
- fail-fast validation for non-loopback binds
- optional bearer fallback for local/dev use
- OAuth protected-resource metadata endpoint
- explicit Host and Origin allowlists
- JSON body size limit
- sanitized JSON errors

OAuth token validation is intentionally left to an external gateway for production deployments.

## Database schema

```sql
CREATE TABLE snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  host TEXT NOT NULL,
  label TEXT DEFAULT 'default',
  timestamp INTEGER NOT NULL,
  cpu_percent REAL NOT NULL,
  memory_percent REAL NOT NULL,
  load_1 REAL NOT NULL,
  raw_json TEXT NOT NULL
);
```

## Release architecture

GitHub Actions is the release automation surface:

- `ci.yml` runs format, lint, typecheck, tests, metadata checks, package dry-run, and Docker smoke.
- `security.yml` runs workflow lint, workflow security lint, secret scan, dependency audit, Trivy, and Scorecard.
- `codeql.yml` runs CodeQL for JavaScript and TypeScript.
- `release.yml` runs release-please manifest mode and publishes only when release-please creates a release.
- `review-thread-gate.yml` blocks actionable unresolved PR review threads.
