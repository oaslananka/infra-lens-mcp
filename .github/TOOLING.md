# Repository tooling strategy

This repository uses one primary control per risk category and keeps overlapping
services advisory unless they provide a distinct signal. The goal is defense in
depth without making every scanner a duplicate blocking gate.

| Area | Primary control | Supporting signal | Merge policy |
| --- | --- | --- | --- |
| Dependency updates | Renovate | GitHub Dependabot alerts and OSV data | Renovate opens version/security PRs; Dependabot version PRs stay disabled |
| Dependency vulnerabilities | OSV-Scanner PR delta | GitHub Dependency Review, Dependabot alerts, Trivy filesystem scan | New lockfile vulnerabilities block PRs; full main/weekly scans publish SARIF |
| SAST / custom policy | Semgrep repository rules | CodeQL, Aikido, DeepScan | Semgrep blocks custom forbidden patterns; other scanners feed review/security dashboards |
| Secrets | GitHub secret scanning and push protection | Gitleaks in `Static Security`; manual Sonar secrets scan | Push protection is preventive; repository scan is defense in depth |
| Container / filesystem | Trivy | Docker build smoke and dependency review | Medium/high/critical fixed findings block |
| Coverage | Jest thresholds | Codecov trends, patch coverage, annotations, and Test Analytics | Jest is the blocking gate; Codecov starts informational |
| Code quality | ESLint, TypeScript, Prettier | SonarQube Cloud | Native checks and Sonar new-code quality gate block |
| Workflow security | actionlint and zizmor | OSSF Scorecard | Canonical CI gate blocks; local hooks are manual to avoid duplicate default pre-commit work |
| Merge automation | GitHub ruleset and native auto-merge | Review Thread Gate | No Mergify; enable native merge queue only when PR concurrency justifies it |
| Releases | release-please | release reconciliation | Implementation PRs never publish |
| Supply chain | Full-SHA action pins, OIDC, provenance, attestations | OSSF Scorecard, SBOM, dependency review | Release workflows fail closed on identity/version mismatches |

## Blocking checks

The active `main` ruleset requires the focused checks that protect build, runtime,
security, compatibility, dependency review, custom SAST, and maintainability.
CodeQL and external AppSec integrations remain visible but are not all required
at once. OSV-Scanner is required specifically for new dependency vulnerabilities rather than source-code findings. Codecov is not a second blocking coverage gate while Jest and Sonar
already enforce local/new-code quality.

## Local hooks

Default pre-commit hooks remain deterministic and avoid full test suites, Docker
builds, or cloud analysis. Workflow audits are explicit manual commands because
the same actionlint and zizmor scans already run once in `Static Security`:

```bash
pnpm run workflow:lint
pnpm run workflow:security
pnpm run workflow:check
```

`mise install` provides the pinned system actionlint binary. The zizmor manual
hook uses the isolated pre-commit environment and offline audits.

## GitHub merge model

The repository currently has one active maintainer, so a mandatory approving
review would make every change unmergeable. Conversation resolution remains
required. Native auto-merge and strict required checks are sufficient at the
current PR volume. If concurrent PR traffic grows, enable GitHub merge queue and
add `merge_group` triggers to every required workflow before enforcing it.

## GitHub Actions runtime policy

All JavaScript actions are pinned to immutable full commit SHAs and maintained by
Renovate. Checkout, setup-node, artifact, and Docker publishing actions use
Node 24-compatible major releases. The repository defaults `GITHUB_TOKEN` to
read-only and does not allow workflow tokens to approve pull-request reviews.
Release Please uses its dedicated token, and long-lived cloud/package credentials
are avoided in favor of GitHub OIDC wherever the destination supports it.
