# Contributing to infra-lens-mcp

## Development setup

```bash
git clone https://github.com/oaslananka/infra-lens-mcp.git
cd infra-lens-mcp
mise trust
mise install
pnpm install --frozen-lockfile
pnpm run hooks:install
pnpm run build
pnpm test
```

Use Node.js 24 LTS for local development when possible. The package keeps `engines.node` at `>=22`, so CI also verifies Node 22 compatibility.

## Workflow

1. Create a branch from `main`.
2. Keep changes focused and covered by tests.
3. Run the relevant checks before pushing.
4. Open a pull request with a clear technical description and no secret values.

`main` is protected. Pull requests must be current with `main`, use linear history, resolve review conversations, and pass the active ruleset checks before merge:

- `Quick Gates`
- `Full Gates Node 24`
- `Static Security`
- `Docker Build Smoke`
- `Host Compatibility (windows-2025)`
- `dependency-review`
- `OSV Dependency Delta / osv-scan`
- `Semgrep`
- `SonarCloud Code Analysis`

Other platform and security jobs still provide evidence and must be reviewed when they report findings, even when they are not protected-branch requirements. The category ownership and blocking/advisory split are documented in [`.github/TOOLING.md`](./.github/TOOLING.md).

Approvals are not required while this repository has a single active maintainer; enable at least one required approval when another maintainer can review without blocking releases.

Use Conventional Commits in imperative mood:

```text
fix(http): require origin and host validation
chore(runtime): move CI and Docker to Node 24
ci(release): add release-please manifest automation
```

## Validation

```bash
pnpm run format:check
pnpm run lint
pnpm test
pnpm run test:coverage
pnpm run build
pnpm run docs:api:check
pnpm run check:metadata
pnpm run check:renovate
pnpm run check:osv
pnpm run check:overrides
pnpm run check:audit
pnpm run security:semgrep
pnpm run workflow:check
pnpm run package:dry-run
pnpm run release:dry-run
```

`pnpm run prepush` runs the standard local push gate. SonarQube Cloud Automatic Analysis remains the protected pull-request check and must not be duplicated by a CI scanner.

Run Docker-backed e2e tests when SSH, collector, Docker, or transport behavior changes:

```bash
docker compose -f docker-compose.test.yml up -d --build
pnpm run test:e2e
docker compose -f docker-compose.test.yml down --volumes
```

## Security-sensitive changes

Changes to SSH authentication, host key verification, HTTP transport, redaction, workflow permissions, package metadata, or release automation should update the relevant docs under `docs/` and include targeted regression tests.

Do not commit `.env` files, registry tokens, SSH private keys, prompt exports, chat transcripts, scratch files, local SBOM exports, tarballs, or generated build output.

## Governance

Follow [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md). Use [SUPPORT.md](./SUPPORT.md) for support channels and response expectations. Label taxonomy, triage, stale handling, and Discussions policy are documented in [docs/governance.md](./docs/governance.md).

## Release discipline

Implementation PRs must not publish npm packages, containers, MCP Registry metadata, marketplace artifacts, or production GitHub Releases. Releases are created only by release-please after merge to `main`, followed by the protected `npm-production` release workflow.

See [docs/release.md](./docs/release.md) and [docs/release-state-machine.md](./docs/release-state-machine.md).

## Manual SonarQube secrets scan

The current SonarQube CLI is pinned by `.mise.toml` and exposed as an authenticated manual pre-commit check for credential-handling, deployment, or release changes:

```bash
SONARQUBE_CLI_TOKEN='<user-token>' \
SONARQUBE_CLI_ORG='oaslananka' \
pnpm run sonar:secrets
```

Do not commit or print the token.
