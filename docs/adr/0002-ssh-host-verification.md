# ADR 0002: SSH Host Verification

- Status: Accepted
- Date: 2026-05-26
- Owners: maintainers

## Context

The server connects to Linux hosts over SSH and may receive sensitive hostnames, usernames, private keys, passwords, or passphrases in trusted local contexts. Accepting unknown host keys would make metric collection vulnerable to interception and would weaken the security guarantees expected from operational tooling.

## Decision

Keep strict SSH host key verification enabled by default. A connection is accepted only when a pinned SHA256 host key fingerprint or a matching OpenSSH `known_hosts` entry verifies the remote key. `MCP_SSH_STRICT_HOST_CHECKING=false` remains available only for disposable local fixtures and logs a warning once per process.

Remote-safe runtime profiles must reject raw passwords, private keys, and passphrases in tool input and must require `MCP_SSH_ALLOWED_HOSTS`.

## Consequences

- Positive: The default posture protects operators from accidental trust-on-first-use behavior.
- Positive: Tests can still use disposable fixtures without weakening production defaults.
- Positive: Remote-safe profiles reduce credential exposure when HTTP is deployed behind another boundary.
- Negative: First-time local setup requires known_hosts or pinned fingerprint material.
- Follow-up: Keep e2e coverage around strict verification and the disposable fixture bypass.

## Alternatives Considered

| Option | Pros | Cons | Fit |
| --- | --- | --- | --- |
| Strict by default with pinned fingerprint or known_hosts | Strong default trust model and compatible with OpenSSH workflows | Requires setup before first connection | High |
| Trust on first use | Faster first connection | Can persist a malicious key if the first connection is intercepted | Low |
| Disable host verification for local use | Lowest setup friction | Unsafe default for an operational security tool | Low |
