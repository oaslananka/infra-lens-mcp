# Node.js support policy

Checked on 2026-07-20.

## Supported runtime lines

| Node line | Repository status | CI treatment |
| --- | --- | --- |
| Node 22 | Minimum supported runtime | Required full gate |
| Node 24 | Recommended and type-definition baseline | Required full gate and host compatibility lanes |
| Node 26 | Forward-compatibility canary | Non-blocking lint, unit, build, and package lane |
| Older than Node 22 | Unsupported | Rejected by `engines.node` |

The package compiles against `@types/node` 24.x so declarations match the recommended LTS line without accidentally depending on Node 26-only APIs. Runtime code must continue to execute on Node 22 until a documented major-version policy change.

## Promotion and retirement rules

- Review the matrix at least quarterly and whenever Node.js changes LTS status.
- A new even-numbered release starts as a non-blocking canary.
- Promote a canary only after native dependencies, MCP transports, package installation, and SSH E2E remain consistently green.
- Removing a supported Node line is a breaking change unless that line has reached upstream end of life and release notes announce the change.
- Changes to `.node-version`, `.nvmrc`, `engines.node`, `@types/node`, Docker images, or the CI matrix must be made together or explicitly explain the intentional difference.

## Local verification

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm run lint
corepack pnpm test
corepack pnpm run build
npm pack --dry-run
```

Run the same commands under Node 22 and Node 24 before changing the support contract. Record Node 26 failures as compatibility issues even while its lane remains non-blocking.
