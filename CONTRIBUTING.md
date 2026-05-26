# Contributing to mcp-infra-lens

## Development setup

```bash
git clone https://github.com/oaslananka/infra-lens-mcp.git
cd infra-lens-mcp
corepack enable
corepack prepare pnpm@11.3.0 --activate
pnpm install --frozen-lockfile
pnpm run build
pnpm test
```

Use Node.js 24 LTS for local development when possible. The package keeps `engines.node` at `>=22`, so CI also verifies Node 22 compatibility.

## Workflow

1. Create a branch from `main`.
2. Keep changes focused and covered by tests.
3. Run the relevant checks before pushing.
4. Open a pull request with a clear technical description and no secret values.

`main` is protected. Pull requests must be current with `main`, use linear history, resolve review conversations, and pass these required checks before merge:

- `Quick Gates`
- `Full Gates Node 22`
- `Full Gates Node 24`
- `Docker Build Smoke`
- `Static Security`
- `Container Security`
- `OSSF Scorecard`
- `Analyze JavaScript and TypeScript`
- `Review Thread Gate`

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
pnpm run check:metadata
pnpm run package:dry-run
pnpm run release:dry-run
```

Run Docker-backed e2e tests when SSH, collector, Docker, or transport behavior changes:

```bash
docker compose -f docker-compose.test.yml up -d --build
pnpm run test:e2e
docker compose -f docker-compose.test.yml down --volumes
```

## Security-sensitive changes

Changes to SSH authentication, host key verification, HTTP transport, redaction, workflow permissions, package metadata, or release automation should update the relevant docs under `docs/` and include targeted regression tests.

Do not commit `.env` files, registry tokens, SSH private keys, prompt exports, chat transcripts, scratch files, local SBOM exports, tarballs, or generated build output.

## Release discipline

Implementation PRs must not publish npm packages, containers, MCP Registry metadata, marketplace artifacts, or production GitHub Releases. Releases are created only by release-please after merge to `main`, followed by the protected `npm-production` release workflow.

See [docs/release.md](./docs/release.md) and [docs/release-state-machine.md](./docs/release-state-machine.md).
