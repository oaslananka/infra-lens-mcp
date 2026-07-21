# Testing

## Runtime

Use Node.js 24 LTS for development and release parity:

```bash
node --version
corepack enable
corepack prepare pnpm@11.15.1 --activate
pnpm --version
```

CI also runs the main test matrix on Node.js 22 because `package.json` declares `engines.node >=22`.

## CI host matrix

CI keeps Linux as the primary required platform for full gates, Docker smoke tests, SSH e2e tests, CodeQL, and security scans. The host compatibility job also runs on `windows-2025` and `macos-15` with Node.js 24 to catch native install, lint, unit test, build, metadata, and package dry-run regressions on non-Linux hosts.

Docker-backed SSH e2e tests stay Linux-only because they require Docker Compose and a disposable Linux SSH fixture. The CI `SSH E2E` job starts the fixture with `docker compose -f docker-compose.test.yml up --detach --build`, runs `pnpm run test:e2e`, prints fixture logs for diagnostics, and removes containers and volumes with `docker compose ... down --volumes --remove-orphans`.

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
pnpm run check:golden
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

`pnpm run check:package-size` reads `package-size-policy.json` and validates the packed npm artifact from `npm pack --dry-run --json --ignore-scripts`. Run `pnpm run build` first. The byte budgets include generated `dist`, generated API docs, the machine-readable performance policy, and reviewed incident examples. `docs/demo.gif` is intentionally excluded from the npm artifact. Raise a budget only with measured evidence explaining why the public package must grow.

## Performance regression gate

`pnpm run test:perf` runs deterministic local benchmarks against the built `dist` output. Run `pnpm run build` first. The gate reads `performance-budget.json` and covers:

- SSH collection parsing with a local fake runner, no production SSH host.
- Full and minimal SSH command-plan counts.
- SQLite history writes against a temporary database.
- Baseline anomaly analysis with seeded local samples.
- HTTP origin, host, and bearer validation.
- Cursor pagination over a 5,000-row synthetic history.
- JSON/NDJSON export elapsed time, output bytes, and retained heap growth.

The thresholds are intentionally broad enough for shared CI variance and are meant to catch algorithmic or resource regressions, not small machine-to-machine noise. Budget changes require before/after measurements in the pull request. Sampling tests also assert that timers are released after success and failure.

## Critical-path coverage

The coverage gate includes both executable entry points and enforces a global branch floor of 80%. Critical modules also have per-file branch floors: collector 75%, HTTP security 80%, SSH 80%, and shutdown 70%. Integration tests spawn the stdio and HTTP entry points as child processes, complete a real MCP initialize/tools-list handshake, exercise a real listening socket, and verify SIGTERM cleanup.

## Golden incident fixtures

`examples/incidents` contains reviewed snapshots and exact expected analysis output for CPU saturation, memory pressure, inode exhaustion, bounded network loss, and service/kernel pressure. CI runs:

```bash
pnpm run check:golden
```

Intentional analyzer-output changes must be regenerated explicitly and reviewed as JSON diffs:

```bash
pnpm run golden:update
pnpm run check:golden
```

Do not update golden output merely to make a failing test pass; the pull request must explain the behavior change and why each changed recommendation, severity, health score, or evidence field is correct.


## Observability export contract

`pnpm run test:observability` verifies latest-row selection, bounded metric conversion, OpenMetrics escaping/content, secure listener defaults, OTLP JSON encoding, timeout/error behavior, and runtime lifecycle. The integration entrypoint suite seeds a temporary SQLite database, starts `infra-lens-observe`, scrapes the real TCP endpoint, and verifies SIGTERM shutdown.

The focused suite runs in Quick Gates and the network/egress cases are also mapped into `test:abuse` and the executable threat model.

## Docker-backed SSH e2e target

Bring up the disposable SSH fixture:

```bash
docker compose -f docker-compose.test.yml up -d --build
pnpm run test:e2e
docker compose -f docker-compose.test.yml down --volumes
```

Use the same sequence in Windows 11 PowerShell when Docker Desktop is running:

```powershell
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

The CI security workflow runs SHA-pinned actionlint/Gitleaks tool versions and the SHA-pinned official `zizmor-action`. Equivalent local checks are:

```bash
actionlint
zizmor --offline --min-severity low .github/workflows
gitleaks detect --source . --no-git --redact --verbose
```

Run the same tools locally when changing workflows or release automation.

## Git hooks and static analysis

Install the cross-platform hook framework once per clone:

```bash
mise trust
mise install
pnpm run hooks:install
```

The pre-commit stage validates file hygiene, JSON/YAML syntax, staged formatting and lint, TypeScript types, and repository-specific Semgrep rules. The pre-push stage runs the broader repository gates:

```bash
pnpm run prepush
```

SonarQube Cloud uses Automatic Analysis and `.sonarcloud.properties`; there is intentionally no `sonar-project.properties` or CI scanner workflow. Run `pnpm run sonar:secrets` manually with `SONARQUBE_CLI_TOKEN` and `SONARQUBE_CLI_ORG=oaslananka` when a local credential-leak scan is required.

Run the deterministic security checks directly with:

```bash
pnpm run security:semgrep
pnpm run check:renovate
pnpm run check:osv
pnpm run check:overrides
pre-commit run --all-files
```


## OSV dependency vulnerability gates

`OSV-Scanner PR Scan` compares the pull-request `pnpm-lock.yaml` with the target branch and blocks only newly introduced known vulnerabilities. `OSV-Scanner Full Scan` runs after `main` pushes, every Monday, and on manual dispatch; it scans the complete lockfile, fails on any finding, and uploads SARIF to GitHub code scanning.

The official OSV reusable workflows are pinned to the immutable v2.3.8 commit. Repository policy validation ensures both scans remain fail-closed, SARIF-enabled, and restricted to the lockfile without guided remediation:

```bash
pnpm run check:osv
```

Dependency Review still owns pull-request dependency graph and license changes. Trivy still owns filesystem and container vulnerability scans, so OSV does not duplicate those jobs.

## Codecov observability

The Node 24 coverage job uploads `coverage/lcov.info` and
`coverage/cobertura-coverage.xml` to Codecov with GitHub OIDC. Jest also emits
`reports/junit/jest.xml`, which is uploaded through the same pinned Codecov action with `report_type: test_results` even when
the test command fails, so failed-test evidence remains visible.

Repository-local Jest thresholds remain the authoritative blocking coverage
gate. Codecov project and patch statuses start as informational with an
automatic base target and a 1% tolerance while the main-branch baseline is
established. After a stable baseline exists, repository maintainers may make a
single Codecov status required; duplicate Codecov and Sonar coverage gates
should not both block merges.

The Codecov GitHub App must be enabled for this repository so PR comments and
checks can be published. Upload authentication uses OIDC; no long-lived
`CODECOV_TOKEN` secret is required.

Codecov JavaScript Bundle Analysis is intentionally not enabled. This package
is a Node.js MCP server compiled directly with TypeScript and does not produce a
Rollup, Vite, or Webpack browser bundle. Published artifact growth is already
guarded by `package-size-policy.json`, package dry-runs, and resource budgets.
Revisit bundle analysis only if the repository adds a supported bundler.

Validate repository configuration after edits with:

```bash
curl --fail --silent --show-error --data-binary @codecov.yml https://codecov.io/validate
```
