# Incident Tools Design

## Goal

Turn persisted and current infrastructure evidence into reviewable incident artifacts without executing remediation.

## Tools

`plan_remediation` collects one read-only snapshot, analyzes it, and returns ordered approval-required steps. Each step includes evidence, rationale, confidence, verification, rollback guidance, and an explicit `requires_approval: true` marker. Recommendations remain prose; the server never executes commands.

`draft_incident_report` reads persisted observation snapshots for one host and time window. It returns a factual incident report plus a postmortem draft with timeline, impact signals, detection evidence, contributing factors, actions, and open questions. Empty windows return a valid incomplete draft rather than inventing facts.

`compare_incident_windows` compares either adjacent time windows for one host or the same recent window across two hosts. It reports sample counts, averages, maxima, deltas, and directional summaries for CPU, memory, and load.

## Safety

All three tools are read-only. Live collection uses the existing fixed SSH command set and policy layer. Historical tools query only observation rows. No shell command, service restart, file deletion, scaling action, or configuration update is performed. Proposed actions are always review-first and carry verification and rollback text.

## Data boundaries

Persisted `raw_json` is parsed through `MetricSnapshotSchema`; invalid rows are skipped and counted. Outputs may include anomaly evidence and process names already collected by infra-lens, but never SSH credentials. Reports distinguish observed facts from hypotheses and unknowns.
