---
name: inventory-audit
description: Inventory and baseline audit workflow for infra-lens-mcp, including host capability inventory, recorded baselines, drift comparison, and audit-ready reporting.
---

# Inventory Audit Skill

Use this skill for repeatable infrastructure inventory, baseline capture, and drift review.

## Workflow

1. Collect host capabilities and current snapshot data.
2. Record a baseline only when the user asks for a baseline update.
3. Compare current state to a selected baseline.
4. Report inventory facts, baseline deltas, missing data, and follow-up checks.
5. Keep the output audit-ready: timestamp, host, evidence, delta, severity, and recommendation.
