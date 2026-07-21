# Incident Workflows

Infra Lens exposes three incident-oriented MCP tools. They produce review artifacts only and never execute remediation.

## Remediation plan

`plan_remediation` collects one current snapshot through the existing read-only SSH collector and returns ordered steps with severity, evidence, confidence, verification checks, rollback guidance, and `requires_approval: true`. The top-level response always contains `review_required: true` and `execution_performed: false`.

Treat `proposed_action` as a hypothesis for an operator or service owner to review. The tool does not restart services, delete files, scale workloads, change configuration, or run commands derived from remote output.

## Incident and postmortem draft

`draft_incident_report` reads only persisted observation rows for one host and a bounded 1–168 hour window. It returns:

- an executive summary and impact signals;
- observed detection evidence;
- first, peak CPU, peak memory, and latest timeline entries;
- the same review-first remediation structure;
- contributing-factor hypotheses, improvement actions, and open questions.

Invalid historical JSON rows are skipped and counted. A window with no valid observations returns an explicitly `incomplete` draft rather than invented facts. A draft remains `partial` when invalid rows were encountered.

## Host and time-window comparison

`compare_incident_windows` accepts `host`, `recent_hours`, optional `end_timestamp`, optional `compare_host`, and a bounded `limit`.

- Without `compare_host`, it compares the recent window with the immediately preceding window for the same host.
- With `compare_host`, it compares both hosts over the same recent window.

The comparison reports sample counts, average and maximum CPU, memory, and load, plus signed deltas and `increased`, `decreased`, or `stable` directions. Empty windows remain visible with zero samples; operators must not interpret missing evidence as healthy behavior.

## Safety and privacy

All three tools advertise `readOnlyHint: true` and `destructiveHint: false`. Historical tools do not open SSH sessions. Live planning uses the fixed collector command set and existing host/user/port and host-key policies. Outputs may contain already-collected process names and operational evidence, so access should follow the same privacy controls as SQLite history and analysis output.
