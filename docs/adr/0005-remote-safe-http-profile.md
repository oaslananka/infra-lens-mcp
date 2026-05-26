# ADR 0005: Remote-Safe HTTP Profile

- Status: Accepted
- Date: 2026-05-26
- Owners: maintainers

## Context

The HTTP transport is useful for controlled deployments, but it changes the threat model. Unlike stdio, HTTP can be exposed across a network, so raw SSH credentials in tool input and unrestricted host access become higher-risk behaviors.

## Decision

Require a remote-safe runtime profile for non-loopback HTTP deployments. `remote-safe`, `chatgpt`, and `claude` profiles remove raw SSH credential fields from connection schemas, require `MCP_SSH_ALLOWED_HOSTS`, and depend on external credential or gateway handling. Non-loopback HTTP must also configure auth, allowed origins, and allowed hosts before the process accepts traffic.

## Consequences

- Positive: HTTP deployments fail fast when they are missing the controls needed for remote use.
- Positive: Raw SSH credentials remain limited to trusted local contexts.
- Positive: The same MCP tools can be exposed through HTTP without changing handler behavior.
- Negative: Remote deployments need more environment configuration than local stdio.
- Follow-up: Public OAuth validation remains outside the package until a production-ready token validation path is implemented.

## Alternatives Considered

| Option | Pros | Cons | Fit |
| --- | --- | --- | --- |
| Remote-safe profile gate | Preserves HTTP support while reducing credential and host exposure risk | Requires explicit deployment configuration | High |
| Same schema for stdio and HTTP | Simpler implementation | Allows raw credentials over a network-facing transport | Low |
| Remove HTTP transport | Smallest network attack surface | Blocks controlled remote integrations and connector experiments | Medium |
