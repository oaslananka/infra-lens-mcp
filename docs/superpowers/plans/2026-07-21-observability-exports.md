# Observability Exports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans and TDD task-by-task.

**Goal:** Add a disabled-by-default standalone OpenMetrics and OTLP exporter for latest persisted observations.

**Architecture:** Read one latest observation per host, convert it into a shared metric-point model, render OpenMetrics or OTLP JSON, and run both from a separate entrypoint.

**Tech Stack:** TypeScript 6, Node.js 22+, better-sqlite3, native HTTP/fetch, Jest.

## Constraints

- No new runtime dependency or scrape-triggered SSH.
- No process/warning/kernel/distro/credential strings.
- Loopback and disabled by default; remote bind requires explicit opt-in.
- OpenMetrics 1.0 and OTLP/HTTP JSON.
- Existing coverage, security, docs, and package policies remain green.

### Task 1: Read model
- [ ] Red tests for latest observation per host, baseline exclusion, ordering, invalid JSON.
- [ ] Implement and export `getLatestObservationSnapshots()`.
- [ ] Focused tests and commit.

### Task 2: Metric model and OpenMetrics
- [ ] Red tests for values, optional metrics, freshness, escaping, finite filtering, EOF.
- [ ] Implement conversion and renderer.
- [ ] Focused tests and commit.

### Task 3: Config and scrape server
- [ ] Red tests for disabled/default/remote/bounds and HTTP behavior/security headers.
- [ ] Implement strict config and request handler.
- [ ] Focused tests/lint and commit.

### Task 4: OTLP
- [ ] Red tests for JSON gauge encoding, headers, endpoint, timeout and response errors.
- [ ] Implement one-shot native-fetch OTLP export.
- [ ] Focused tests/lint and commit.

### Task 5: Runtime
- [ ] Red tests for immediate/periodic export, unrefed timer, signals and shutdown.
- [ ] Red child-process scrape test.
- [ ] Implement `infra-lens-observe`, package entries and lifecycle.
- [ ] Tests and commit.

### Task 6: Governance and delivery
- [ ] Threat model, docs, CI abuse gate, generated API docs.
- [ ] Full repository verification.
- [ ] PR closes #60; inspect and fix every bot/agent comment before merge.
