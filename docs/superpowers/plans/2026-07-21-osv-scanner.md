# OSV-Scanner Security Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the removed Snyk PR signal with quota-free, SHA-pinned OSV dependency gates.

**Architecture:** Use separate official reusable workflows for pull-request dependency deltas and full main/scheduled scans. Enforce the exact workflow contract through a repository-local policy script and add the observed PR check to the active ruleset.

**Tech Stack:** GitHub Actions, OSV-Scanner v2.3.8, Node.js policy scripts, Renovate, actionlint, zizmor.

## Global Constraints

- Scan only `pnpm-lock.yaml`.
- Pin official reusable workflows to `9a498708959aeaef5ef730655706c5a1df1edbc2`.
- Keep Dependency Review, Trivy, Renovate/Dependabot, Semgrep, CodeQL, Gitleaks, and push protection in their existing roles.
- Do not enable OSV guided remediation or automatic dependency modification.

---

### Task 1: Add executable OSV policy

**Files:**
- Create: `scripts/check-osv-config.mjs`
- Modify: `package.json`

- [ ] Write the policy script first and verify it fails while workflows are absent.
- [ ] Require exact events, permissions, reusable workflow SHAs, lockfile scope, SARIF, fail-closed behavior, safe Trivy pin, and removal of Snyk references.
- [ ] Add `check:osv` to local and CI policy gates.

### Task 2: Add OSV workflows and Renovate coverage

**Files:**
- Create: `.github/workflows/osv-scanner-pr.yml`
- Create: `.github/workflows/osv-scanner-full.yml`
- Modify: `renovate.json`
- Modify: `scripts/check-renovate-config.mjs`

- [ ] Add the PR delta reusable workflow for pull requests and merge groups.
- [ ] Add the full scan for main pushes, weekly schedule, and manual dispatch.
- [ ] Add OSV-Scanner to reviewed security-tool updates.
- [ ] Run policy, Renovate, actionlint, and zizmor checks.

### Task 3: Update security ownership documentation

**Files:**
- Modify: `.github/TOOLING.md`
- Modify: `docs/security.md`
- Modify: `docs/testing.md`
- Modify: `docs/architecture.md`
- Modify: `docs/governance/repository-controls.md`
- Modify: `CONTRIBUTING.md`

- [ ] Remove Snyk references and document OSV’s exact role.
- [ ] Document the blocking PR delta and operational full scan.
- [ ] Keep the category ownership matrix non-overlapping.

### Task 4: Prove and protect the PR check

**Files:**
- Live repository ruleset `main-ci-solo-maintainer`

- [ ] Push the branch and open a PR that closes issue #112.
- [ ] Inspect all bot comments, reviews, inline comments, and Sonar findings.
- [ ] Observe the exact OSV PR check context and add it to the ruleset.
- [ ] Update repository-control docs with the observed context.
- [ ] Merge only after all required and advisory findings are resolved.
