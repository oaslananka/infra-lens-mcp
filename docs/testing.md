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
pnpm run check:dead-code
pnpm test
pnpm run test:integration
pnpm run test:coverage
pnpm run build
pnpm run test:perf
pnpm run docs:api:check
CHECK_METADATA_REQUIRE_DIST=true pnpm run check:metadata
pnpm run check:package-size
pnpm audit --audit-level moderate
npm pack --dry-run
pnpm run release:dry-run
```

`task ci` runs the same effective local gates when Task is installed.

## Dead code and package size

`pnpm run check:dead-code` uses Knip to report unused TypeScript files, exports, and exported types across `src`, `test`, and `scripts`. `knip.json` intentionally treats test files and repository scripts as entry points because they are invoked by package scripts, CI workflows, and release tooling rather than by application imports.

`pnpm run check:package-size` reads `package-size-policy.json` and validates the packed npm artifact from `npm pack --dry-run --json --ignore-scripts`. Run `pnpm run build` first. The budget intentionally includes generated `dist`, generated API docs, and `docs/demo.gif`; raise the budget only with release-note evidence explaining why the public package must grow.

## Performance regression gate

`pnpm run test:perf` runs deterministic local benchmarks against the built `dist` output. Run `pnpm run build` first. The gate covers:

- SSH collection parsing with a local fake runner, no production SSH host.
- SQLite history writes against a temporary database.
- Baseline anomaly analysis with seeded local samples.
- HTTP origin, host, and bearer validation.

The thresholds are intentionally broad enough for CI variance and are meant to catch algorithmic regressions, not small machine-to-machine noise. Add evidence from this command to release or performance-sensitive PRs.

## Docker-backed SSH e2e target

Bring up the disposable SSH fixture:

```bash
docker compose -f docker-compose.test.yml up -d --build
pnpm run test:e2e
docker compose -f docker-compose.test.yml down --volumes
```

Run Docker-backed e2e tests when SSH transport behavior, host key verification, Docker packaging, or connection handling changes. Run `pnpm run test:perf` for local parser, database, analysis, and HTTP validation performance changes that do not need a real SSH daemon.

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
