# Architecture Decision Records

This directory records accepted technical decisions that shape `infra-lens-mcp`.

## Index

| ADR | Status | Decision |
| --- | --- | --- |
| [0001](./0001-mcp-transport-model.md) | Accepted | Keep stdio as the default transport and Streamable HTTP as an explicitly hardened deployment mode |
| [0002](./0002-ssh-host-verification.md) | Accepted | Keep strict SSH host key verification enabled by default |
| [0003](./0003-sqlite-snapshot-history.md) | Accepted | Store local metric history in SQLite without SSH credentials |
| [0004](./0004-release-automation.md) | Accepted | Use release-please, protected Actions, provenance, and npm Trusted Publishing |
| [0005](./0005-remote-safe-http-profile.md) | Accepted | Require remote-safe profiles for non-loopback HTTP deployments |
| [0006](./0006-oauth-gateway-strategy.md) | Accepted | Keep identity and authorization at an upstream OAuth-aware gateway |
| [0007](./0007-mcp-sdk-v2-migration.md) | Accepted | Stage MCP SDK v2 behind transport adapters after a stable release |

Use [template.md](./template.md) for new records.
