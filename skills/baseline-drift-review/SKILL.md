---
name: baseline-drift-review
description: Baseline drift review workflow for infra-lens-mcp that compares current infrastructure state to recorded baselines and triages operational risk.
---

# Baseline Drift Review Skill

Use this skill when the user asks what changed, whether a host drifted, or whether current infrastructure state is still within expectation.

## Workflow

1. Identify the relevant host and baseline.
2. Capture current state.
3. Compare to the baseline.
4. Explain deltas using focused host evidence.
5. Classify drift as expected, suspicious, operationally risky, or unknown.
6. Recommend next diagnostics without making changes.
