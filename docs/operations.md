# Operations

## Local commands

Use pnpm through Corepack:

```bash
corepack enable
corepack prepare pnpm@11.3.0 --activate
pnpm install --frozen-lockfile
```

Common checks:

```bash
pnpm run lint
pnpm run test:coverage
pnpm run build
pnpm run check:metadata
pnpm run package:dry-run
```

## Doppler

Local Doppler context may provide project `all`, config `main`. Do not commit `doppler.yaml` or any `.env` file with secret values.

Presence check example:

```powershell
$ErrorActionPreference = 'Stop'
doppler --version
doppler run -p all -c main -- powershell -NoProfile -Command "if (-not `$env:NPM_TOKEN) { throw 'NPM_TOKEN missing' }; 'NPM_TOKEN present'"
```

Do not print secret values. Prefer npm Trusted Publishing over `NPM_TOKEN`.

## GitHub repository settings

Recommended default branch protections:

- pull request required
- approving review required
- required status checks
- branch up to date before merge
- force push disabled
- branch deletion disabled
- direct push disabled
- protect `v*` tags

Recommended required checks:

- Review Thread Gate
- Quick Gates
- Full Gates Node 22
- Full Gates Node 24
- Docker Build Smoke
- Static Security
- Container Security
- CodeQL

Do not change branch protection or rulesets from routine code changes. Document requested setting changes in the PR body.

## HTTP deployment

Bind to loopback for local use. For shared environments, put an authenticated HTTPS reverse proxy or OAuth-aware gateway in front of the HTTP transport and configure allowed origins and hosts.
