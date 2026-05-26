# Testing

## Runtime

Use Node.js 24 LTS for development and release parity:

```bash
node --version
corepack enable
corepack prepare pnpm@11.3.0 --activate
pnpm --version
```

CI also runs the main test matrix on Node.js 22 because `package.json` declares `engines.node >=22`.

## Local checks

```bash
pnpm install --frozen-lockfile
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm test
pnpm run test:integration
pnpm run test:coverage
pnpm run build
pnpm run docs:api:check
CHECK_METADATA_REQUIRE_DIST=true pnpm run check:metadata
pnpm audit --audit-level moderate
npm pack --dry-run
pnpm run release:dry-run
```

`task ci` runs the same effective local gates when Task is installed.

## Docker-backed SSH e2e target

Bring up the disposable SSH fixture:

```bash
docker compose -f docker-compose.test.yml up -d --build
pnpm run test:e2e
docker compose -f docker-compose.test.yml down --volumes
```

The fixture listens on:

- host: `127.0.0.1`
- port: `2222`
- username: `testuser`
- password: `testpass`

The e2e fixture explicitly disables strict host checking for the disposable container. Production and normal local operation are strict by default.

## Workflow security tools

The CI security workflow installs and runs:

```bash
actionlint
zizmor --offline --min-severity low .github/workflows
gitleaks detect --source . --no-git --redact --verbose
```

Run the same tools locally when changing workflows or release automation.
