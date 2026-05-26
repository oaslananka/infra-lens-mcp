# Security Notes

## SSH

SSH host key verification is strict by default. A connection is accepted only when one of these checks succeeds:

- `connection.hostKeySha256` matches the remote host key SHA256 fingerprint
- `connection.knownHostsPath` contains a matching OpenSSH `known_hosts` entry
- `MCP_SSH_KNOWN_HOSTS` points to a matching OpenSSH `known_hosts` file

`MCP_SSH_STRICT_HOST_CHECKING=false` exists for disposable local fixtures only and logs a warning once per process.

`remote-safe`, `chatgpt`, and `claude` profiles reject raw passwords, private keys, and passphrases in tool input. These profiles also require `MCP_SSH_ALLOWED_HOSTS`.

## Collector privacy

- `include_processes=false` skips process collection.
- `include_network=false` skips network collection.
- The default process command collects process names, PIDs, CPU, and memory only.
- Secret-like strings in process output, SSH errors, and logs are redacted.

Redaction covers password, passphrase, token, access token, refresh token, secret, client secret, API key, bearer authorization, and private key header patterns.

## HTTP

HTTP defaults to loopback. Non-loopback binds fail unless a remote-safe profile, auth mode, allowed origins, and allowed hosts are configured.

The HTTP policy layer rejects:

- missing or invalid `Origin` when origin enforcement is configured
- missing or invalid `Host` when host enforcement is configured
- missing or invalid bearer auth when bearer mode is configured
- oversized JSON bodies

Errors are returned as sanitized JSON without stack traces.

## MCP connector readiness

HTTP is available for local and controlled deployments, but public connector publication is not marked ready because this package does not implement production OAuth token validation. Public deployments should terminate OAuth and HTTPS in a gateway or reverse proxy before forwarding to this server.

## License and SPDX standards

Run `pnpm run check:licenses` before changing license metadata, dependency manifests, release packaging, or CI security gates. The check verifies:

- `package.json` declares the repository license.
- `REUSE.toml` provides project-level SPDX metadata for tracked files.
- `LICENSES/MIT.txt` and `LICENSE` contain the MIT license text.
- Installed dependency licenses reported by `pnpm licenses list --json --long` match `license-policy.json`.

When adding a new file, keep it covered by `REUSE.toml` or add file-specific SPDX metadata if it uses a different license. When adding a dependency, run `pnpm run check:licenses`; if the dependency introduces a new license expression, either choose a dependency with an already-approved license or update `license-policy.json` with a review note in the pull request.
