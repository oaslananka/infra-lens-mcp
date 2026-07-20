# ADR 0007: Stage MCP TypeScript SDK v2 behind an adapter boundary

- Status: Accepted
- Date: 2026-07-20
- Decision owners: maintainers
- Related issue: #66

## Context

The production server currently uses `@modelcontextprotocol/sdk` v1. A compatibility spike against `@modelcontextprotocol/server@2.0.0-beta.4` and `@modelcontextprotocol/node@2.0.0-beta.4` confirmed the new package split, the `McpServer.registerTool` surface, task-aware tool overloads, and the Node Streamable HTTP transport export.

The beta remains a moving target. Migrating before a stable release would expose users to churn in imports, transport construction, task APIs, and protocol-version handling without providing a required feature today.

## Decision

Keep SDK v1 as the production dependency until SDK v2 is stable and a compatibility branch passes the repository's complete CI, SSH E2E, package, and release checks.

Future SDK-specific code stays behind two boundaries:

1. `server-core.ts` owns transport-independent tool definitions and handlers.
2. `mcp.ts` and `server-http.ts` own SDK registration and transport wiring.

The v2 migration branch must adapt those boundaries rather than rewriting collection, analysis, SQLite, or SSH policy code.

## Compatibility plan

| Surface | v1 production | v2 migration target | Required evidence |
| --- | --- | --- | --- |
| Server import | `@modelcontextprotocol/sdk/server/mcp.js` | `@modelcontextprotocol/server` | Tool-list and tool-call parity |
| Stdio transport | SDK v1 stdio module | `@modelcontextprotocol/node` | Subprocess integration test |
| HTTP transport | SDK v1 Streamable HTTP transport | Node v2 Streamable HTTP transport | Host, Origin, auth, body-limit, and multi-client tests |
| Tool registration | `McpServer.registerTool` | v2 `registerTool` | Identical names, schemas, annotations, and structured output |
| Tasks | Not exposed | Opt in only after cancellation/progress semantics exist | Dedicated task lifecycle tests |
| Protocol versions | Stable supported versions | Explicit v1/v2 matrix | Initialize negotiation fixtures |

## Migration sequence

1. Wait for a stable v2 release and review the final migration guide.
2. Create an adapter branch that preserves the current tool definition tuple and public schemas.
3. Run Node 22, Node 24, and non-blocking Node 26 lanes plus Linux, Windows, macOS, Docker, and SSH E2E.
4. Compare packed files, startup behavior, initialization, tool listings, and representative calls against v1 golden fixtures.
5. Publish a prerelease only after the compatibility matrix is green.
6. Promote v2 in a normal release and retain the last v1 tag and rollback procedure.

## Rollback

If initialization, transport, or client interoperability regresses, revert the SDK adapter and release a patch from the last v1-compatible dependency graph. SQLite data and tool payloads remain compatible because the migration boundary does not own storage or business logic.

## Consequences

- Production users remain on the stable v1 line.
- The repository has a concrete, testable v2 path instead of an open-ended rewrite.
- New v2-only features cannot enter production until adapter and rollback gates pass.
