# Governance

## Maintainer model

`infra-lens-mcp` is currently maintained by the repository owner. The project prefers small, reviewable pull requests and requires the protected `main` checks before merge.

## Support channels

GitHub Discussions are enabled and are the preferred place for usage questions, deployment advice, and early ideas. GitHub Issues remain the source of truth for actionable work. Security reports must follow [SECURITY.md](../SECURITY.md).

## Label taxonomy

Every actionable issue should have one label from each taxonomy group when practical:

| Group | Labels | Purpose |
| --- | --- | --- |
| Priority | `priority:P0`, `priority:P1`, `priority:P2`, `priority:P3` | Urgency and response target |
| Area | `area:release`, `area:ci`, `area:security`, `area:docs`, `area:compatibility`, `area:testing`, `area:packaging`, `area:dx`, `area:infra`, `area:governance` | Owning surface |
| Type | `type:bug`, `type:enhancement`, `type:task`, `type:docs`, `type:security` | Work category |
| Risk | `risk:high`, `risk:medium`, `risk:low` | Operational or implementation risk |
| State | `agent:blocked` | External blocker prevents autonomous completion |

Legacy GitHub labels such as `bug`, `enhancement`, `question`, and `help wanted` may stay on older issues, but new governance-tracked issues should use the taxonomy above.

## Priority tiers

- `priority:P0`: security, release, public install, CI, or package artifact blocker. Target initial response within 1 business day.
- `priority:P1`: major compatibility, product, or governance gap. Target initial response within 3 business days.
- `priority:P2`: quality, test, developer experience, or maintainability work. Target initial response within 7 business days.
- `priority:P3`: polish, demo, community, or future roadmap. No fixed response target.

## Triage policy

New issues should be checked for duplicates, scope, security sensitivity, and reproducibility. If the report is a vulnerability, close or edit the public issue to remove sensitive detail and move the reporter to the private security channel.

Actionable issues should include:

- problem and impact
- required changes
- validation commands for Linux/macOS and Windows 11 PowerShell when relevant
- acceptance criteria
- priority, area, type, and risk labels

## Stale policy

Issues labeled `agent:blocked` remain open until the external blocker changes. Other issues may be closed as stale when they have had no maintainer or reporter activity for 90 days and no clear acceptance criteria.

Before closing as stale, leave a comment explaining what evidence is still needed and allow at least 14 days for response. Reopen stale issues when a reporter provides fresh reproduction steps, logs, or a concrete implementation path.

## Pull request policy

Pull requests should describe risk, release impact, validation, and linked issues. Implementation PRs must not publish npm packages, containers, MCP Registry metadata, marketplace artifacts, or production GitHub Releases.

## Dependency automation governance

Renovate is the single source of truth for version updates, including the explicitly enabled pre-commit manager and native mise manager. The repository does not run parallel Dependabot update automation. Repository policy changes must update `renovate.json`, `docs/security.md`, and the automated checks in the same pull request.

Every `pnpm` override and supply-chain release-age exception is registered in `dependency-overrides.json`. Entries require:

- a named owner accountable for removal;
- a concrete compatibility or security reason;
- an HTTPS upstream advisory, issue, changelog, or release reference;
- a review/removal date;
- the exact override version when applicable.

`pnpm run check:overrides` compares the registry against `pnpm-workspace.yaml`, rejects undocumented or orphaned entries, and fails after a review date. Override renewal requires fresh evidence in the pull request; changing only the date is not sufficient.

Renovate pull requests follow the same protected checks as maintainer changes. Digest-only automerge is permitted only through Renovate after all required checks pass. Major, Node runtime, MCP SDK, schema/runtime, security scanner, and release-tool changes require explicit review.
