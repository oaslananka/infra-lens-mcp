---
name: infrastructure-inspection
description: Infrastructure visibility workflow for infra-lens-mcp covering host capability inspection, snapshots, process/load/disk/network facts, and operational findings.
---

# Infrastructure Inspection Skill

Use this skill when an agent needs to inspect infrastructure state through `infra-lens-mcp`.

## Workflow

1. Confirm the inspection target and keep the workflow read-only.
2. Inspect host capabilities before assuming command availability.
3. Capture a snapshot for broad state.
4. Review load, memory, disk, inode, network, process, kernel, and service signals.
5. Compare against baseline data when available.
6. Report findings by severity: critical, warning, informational, unknown.

## Safety

Infra Lens is for observation and diagnostics. Do not claim remediation was performed unless another approved tool actually changed state.
