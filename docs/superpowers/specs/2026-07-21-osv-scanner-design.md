# OSV-Scanner Security Gate Design

## Goal

Replace the removed, quota-limited Snyk pull-request signal with a repository-owned OSV-Scanner control while preserving the existing category-specific security stack.

## Architecture

Two SHA-pinned official reusable workflows provide distinct controls:

- `OSV-Scanner PR Scan` compares the target branch and pull-request head for `pnpm-lock.yaml` and fails only when the change introduces a new known vulnerability.
- `OSV-Scanner Full Scan` scans the complete lockfile on every `main` push, weekly, and on manual dispatch; it uploads SARIF and fails on any known vulnerability.

The PR delta check becomes a required `main` ruleset status only after its actual GitHub check context is observed on the implementation PR. The full scan is operational monitoring rather than a PR requirement.

## Control boundaries

- OSV-Scanner: npm dependency vulnerability detection from `pnpm-lock.yaml`.
- Dependency Review: pull-request dependency graph, severity, and license change policy.
- Renovate and Dependabot alerts: remediation and continuous alerting.
- Trivy: filesystem, container, IaC, and operating-system package scanning; the existing v0.36.0 full-SHA pin remains.
- Semgrep and CodeQL: source-code analysis.
- GitHub push protection and Gitleaks: secret prevention and repository scanning.

## Security constraints

- Official OSV reusable workflows are pinned to commit `9a498708959aeaef5ef730655706c5a1df1edbc2` (`v2.3.8`).
- Permissions are limited to `contents: read`, `actions: read`, and `security-events: write`.
- Scans target only `pnpm-lock.yaml`; source commit scanning and guided remediation are not enabled.
- Both workflows fail closed on vulnerability findings and upload SARIF.
- Renovate must recognize OSV-Scanner as security tooling and require review for updates.
- A repository policy script prevents Snyk references or OSV workflow drift.

## Verification

Run the repository OSV policy check, Renovate validation, actionlint, zizmor, Semgrep, and the normal quick gates. On the PR, inspect all bot comments and observe the exact OSV status context before updating the ruleset.
