# Architecture Decision Records

This directory records accepted technical decisions that shape `mcp-infra-lens`.

## Index

| ADR | Status | Decision |
| --- | --- | --- |
| [0001](./0001-mcp-transport-model.md) | Accepted | Keep stdio as the default transport and Streamable HTTP as an explicitly hardened deployment mode |
| [0002](./0002-ssh-host-verification.md) | Accepted | Keep strict SSH host key verification enabled by default |
| [0003](./0003-sqlite-snapshot-history.md) | Accepted | Store local metric history in SQLite without SSH credentials |
| [0004](./0004-release-automation.md) | Accepted | Use release-please, protected Actions, provenance, and npm Trusted Publishing |
| [0005](./0005-remote-safe-http-profile.md) | Accepted | Require remote-safe profiles for non-loopback HTTP deployments |

Use [template.md](./template.md) for new records.
