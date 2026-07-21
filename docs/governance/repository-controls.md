# Repository control baseline

Checked against the live repository on 2026-07-21.

## Main branch ruleset

The active `main-ci-solo-maintainer` repository ruleset applies to `refs/heads/main` and enforces:

- no branch deletion;
- no non-fast-forward updates;
- linear history;
- pull requests for changes;
- resolution of review threads before merge;
- strict required checks against the latest `main` commit.

Required checks are:

- `Quick Gates`
- `Full Gates Node 24`
- `Static Security`
- `Docker Build Smoke`
- `Host Compatibility (windows-2025)`
- `dependency-review`
- `OSV Dependency Delta / osv-scan`
- `Semgrep`
- `SonarCloud Code Analysis`

The repository currently has one maintainer, so the ruleset requires zero approving reviews while still requiring PRs, checks, and resolved conversations. A future multi-maintainer model should add code-owner and approving-review requirements before removing this exception.

## Actions and production environments

- Default workflow permissions are read-only.
- Workflows request write scopes only in jobs that require them.
- `npm-production` and `mcp-registry` accept deployments only from protected branches.
- npm publication uses Trusted Publishing/OIDC.
- Release Please uses `RELEASE_PLEASE_TOKEN` so release PR updates emit normal workflow events.
- Publication jobs verify an immutable GitHub Release tag before publishing.
- Reconciliation requires matching package metadata, tag commit, GitHub Release, npm provenance, MCP Registry version, and GHCR version.

## External analysis gates

OSV-Scanner PR delta scans compare `pnpm-lock.yaml` against the target branch and fail only when a pull request introduces a new known vulnerability. Full scans run on `main`, weekly, and by manual dispatch; they fail on any known lockfile vulnerability and upload SARIF to code scanning. Dependency Review remains responsible for dependency-graph and license changes, while Trivy remains responsible for filesystem and container findings.

Maintainers inspect actionable comments and review threads from SonarQube Cloud, OSV-Scanner, Aikido, DeepScan, Socket, CodeQL, Semgrep, dependency review, and Scorecard before merge. A green status does not override a concrete inline finding.

## Repeatable verification

```bash
gh api repos/oaslananka/infra-lens-mcp/rulesets/18564690
gh api repos/oaslananka/infra-lens-mcp/actions/permissions/workflow
gh api repos/oaslananka/infra-lens-mcp/environments
gh pr checks <number> --repo oaslananka/infra-lens-mcp
gh api repos/oaslananka/infra-lens-mcp/pulls/<number>/comments
gh api repos/oaslananka/infra-lens-mcp/pulls/<number>/reviews
```

After a release, run `pnpm run release:dry-run`. A complete release reports `state=complete`, `coherent=true`, and an empty blocker list. Never repair drift by moving a tag or republishing an immutable version.
