# ADR 0001: MCP Transport Model

- Status: Accepted
- Date: 2026-05-26
- Owners: maintainers

## Context

`mcp-infra-lens` is primarily a local MCP server that can be launched by desktop MCP clients with `npx -y mcp-infra-lens`. It also exposes a Streamable HTTP entry point for controlled deployments and integration testing. The transport choice affects protocol safety, logging, deployment hardening, and what credentials can be accepted.

## Decision

Keep stdio as the default transport and keep Streamable HTTP as an explicit alternate entry point. The stdio server owns the local desktop use case and must not write user-facing protocol data outside MCP responses. The HTTP server must keep the same tool surface and reuse the shared tool registration code in `src/server-core.ts`.

HTTP deployments must pass through `src/http-security.ts` policy checks before tool handling. Non-loopback HTTP binds are not routine local development; they require an auth mode, allowed origins, allowed hosts, and a remote-safe runtime profile.

## Consequences

- Positive: Desktop clients get the simplest and safest default path through stdio.
- Positive: HTTP deployments reuse the same tool implementation instead of drifting into a second product surface.
- Positive: Transport-specific security policy stays isolated around the HTTP entry point.
- Negative: HTTP remains intentionally conservative and needs gateway support for production OAuth validation.
- Follow-up: Public connector readiness stays false until production OAuth token validation is implemented or delegated in a documented deployment profile.

## Alternatives Considered

| Option | Pros | Cons | Fit |
| --- | --- | --- | --- |
| Stdio default plus hardened HTTP | Matches local MCP clients, preserves one tool surface, supports controlled HTTP deployments | Requires policy checks for HTTP and gateway OAuth for public deployments | High |
| HTTP-only server | Easier to deploy behind web infrastructure | Increases local credential exposure risk and adds auth burden for desktop use | Low |
| Stdio-only server | Smallest attack surface | Blocks controlled remote deployments and HTTP integration scenarios | Medium |
