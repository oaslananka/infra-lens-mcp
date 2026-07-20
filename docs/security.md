# Security Notes

## SSH

SSH host key verification is strict by default. A connection is accepted only when one of these checks succeeds:

- `connection.hostKeySha256` matches the remote host key SHA256 fingerprint
- `connection.knownHostsPath` contains a matching OpenSSH `known_hosts` entry
- `MCP_SSH_KNOWN_HOSTS` points to a matching OpenSSH `known_hosts` file

`MCP_SSH_STRICT_HOST_CHECKING=false` exists for disposable local fixtures only and logs a warning once per process.

`full` profile is for trusted local stdio development only. `remote-safe`, `chatgpt`, and `claude` profiles are for network-facing or connector deployments; they reject inline SSH secret fields before opening a connection, require `MCP_SSH_ALLOWED_HOSTS`, and expect identities to come from an external agent, preset identity, or gateway-managed environment.

Production SSH policy controls are enforced before an SSH connection is opened:

- `MCP_SSH_ALLOWED_HOSTS` supports exact host/IP entries and IPv4 CIDR ranges. It is required for remote-safe profiles and is also enforced in `full` profile when configured.
- `MCP_SSH_ALLOWED_USERS` restricts allowed SSH usernames.
- `MCP_SSH_ALLOWED_PORTS` restricts allowed SSH ports.
- `MCP_SSH_MAX_SESSIONS_PER_HOST` caps active sessions per host and port.
- `MCP_SSH_MAX_CONNECTION_ATTEMPTS_PER_MINUTE` caps connection attempts per host and port in a rolling minute window.

## Collector privacy

- `include_processes=false` skips process collection.
- `include_network=false` skips network collection.
- The default process command collects process names, PIDs, CPU, and memory only.
- Secret-like strings in process output, SSH errors, and logs are redacted.

Redaction covers password, passphrase, token, access token, refresh token, secret, client secret, API key, bearer authorization, and private key header patterns.

## HTTP

HTTP defaults to loopback. Non-loopback binds fail unless a remote-safe profile, auth mode, allowed origins, and allowed hosts are configured.

The HTTP policy layer rejects:

- unsupported endpoint paths and HTTP methods before body parsing
- client-provided `MCP-Session-Id` values because HTTP mode is stateless today
- missing or invalid `Origin` when origin enforcement is configured
- missing or invalid `Host` when host enforcement is configured
- missing or invalid bearer auth when bearer mode is configured
- oversized or non-JSON request bodies
- requests over the configured timeout
- requests above the Node process concurrency limit
- requests above the optional per-client in-memory rate limit

Errors are returned as sanitized JSON without stack traces and include `X-Content-Type-Options: nosniff` and `Cache-Control: no-store`.

When deploying behind a reverse proxy or OAuth gateway, keep the Node process on a private network path, forward only the canonical MCP endpoint, and treat proxy-side limits as an outer layer rather than a replacement for the in-process timeout, concurrency, body-size, origin, and host checks.

## MCP connector readiness

HTTP is available for local and controlled deployments, but public connector publication is not marked ready because this package does not implement production OAuth token validation. Public deployments should terminate OAuth and HTTPS in a gateway or reverse proxy before forwarding to this server.

## GitHub Actions token permissions

Workflows explicitly set workflow-level `permissions` to `contents: read`. Jobs that need write access declare it at job scope only:

- CodeQL declares `security-events: write` on the analysis job so SARIF upload can succeed without granting that write permission to the whole workflow.
- `release-please` declares `contents: write`, `pull-requests: write`, and `issues: write` because it creates release commits, tags, release pull requests, and related issue updates.
- The npm publish job declares `contents: write`, `id-token: write`, and `attestations: write` because it uploads release assets, requests npm trusted-publishing identity, and creates artifact attestations.

Do not add workflow-level write permissions. If a future release job needs additional write access, document the API call or action input that requires it in this section and keep the permission scoped to that job.

## Dependency update policy

Renovate is the canonical dependency-update automation for this repository. Its repository-local policy is defined in `renovate.json`, validated by `pnpm run check:renovate`, and surfaced through the Renovate Dependency Dashboard. GitHub-native Dependabot version and security-update automation remain disabled to avoid duplicate pull requests; secret scanning, push protection, dependency review, and GitHub advisory visibility remain enabled independently.

Renovate manages npm and pnpm dependencies, Node runtime files, Docker images, GitHub Actions, pre-commit hook revisions, workflow pnpm pins, and pinned security tools. The policy applies a three-day release-age guard, weekly lock-file maintenance, explicit approval for major/runtime-sensitive updates, digest automerge only after protected checks, and manual review for MCP SDK, schema/runtime, security scanner, and release-tool changes.

Dependency Dashboard triage occurs at least weekly:

- approve intentional major and runtime updates only after migration notes are reviewed;
- investigate branches waiting on internal checks instead of force-creating a PR without evidence;
- delete or let Renovate recreate branches that are more than seven days stale or no longer based on current `main`;
- use the dashboard manual-run checkbox after policy changes or stale-branch cleanup;
- never bypass required branch checks for bot-authored pull requests.

Urgent vulnerability fixes may bypass the normal release-age window only when the exception is recorded in `dependency-overrides.json` with an owner, reason, upstream advisory or release, and a near-term review date. `pnpm run check:overrides` fails after the review date or when an active override/exception lacks governance metadata.

Audit response targets are:

| Severity | Initial response | Resolution target |
| --- | --- | --- |
| Critical | Same day | 24 hours or disable the affected path |
| High | 1 business day | 3 business days |
| Moderate | 3 business days | 7 calendar days |
| Low | 7 business days | 30 calendar days |

Development-only findings use the same triage targets. A longer acceptance requires documented non-exploitability, an owner, and an expiry date; findings must not remain indefinitely below the blocking threshold without review.

## Local and CI static analysis

`.pre-commit-config.yaml` runs repository hygiene, staged Prettier/ESLint checks, TypeScript typechecking, and deterministic local Semgrep rules. The pre-push stage runs coverage, build, metadata, Renovate/override governance, Semgrep, and optional SonarQube Cloud analysis. `pnpm run hooks:install` installs both hook types after `pre-commit` is installed with `pipx`.

Semgrep is also enforced in GitHub Actions. The deterministic `.semgrep.yml` policy runs for every pull request, including forks; internal branches additionally run the Semgrep AppSec Platform scan through `SEMGREP_APP_TOKEN`. SonarQube Cloud remains a protected pull-request check. Local Sonar analysis uses the official `@sonar/scan` package and runs only when `SONAR_TOKEN` is present, so secrets are never required for ordinary commits.

## License and SPDX standards

Run `pnpm run check:licenses` before changing license metadata, dependency manifests, release packaging, or CI security gates. The check verifies:

- `package.json` declares the repository license.
- `REUSE.toml` provides project-level SPDX metadata for tracked files.
- `LICENSES/MIT.txt` and `LICENSE` contain the MIT license text.
- Installed dependency licenses reported by `pnpm licenses list --json --long` match `license-policy.json`.

When adding a new file, keep it covered by `REUSE.toml` or add file-specific SPDX metadata if it uses a different license. When adding a dependency, run `pnpm run check:licenses`; if the dependency introduces a new license expression, either choose a dependency with an already-approved license or update `license-policy.json` with a review note in the pull request.

### Current time-bounded audit acceptance

`GHSA-4x5r-pxfx-6jf8` in development-only `@babel/core` is recorded in `audit-policy.json` through 2026-08-15. The advisory names `>=7.29.1` as fixed, but that compatible release is not published; forcing Babel 8 into Jest is not accepted as a safe patch. `pnpm run check:audit` will fail if the advisory severity increases, a different advisory appears, the acceptance expires, or the finding disappears without the stale policy entry being removed.
