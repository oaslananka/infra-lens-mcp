# Progress and Cancellation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fast analysis tool and make sampled analysis report MCP progress, cancel promptly, clean resources, and avoid partial persistence.

**Architecture:** A transport-neutral tool request context is adapted from MCP SDK request metadata. Cancellation flows from the SDK signal through sampling delays, collector calls, SSH connection setup, and SSH command streams. The existing sampled tool remains backward compatible; a new snapshot-analysis tool is additive.

**Tech Stack:** TypeScript, MCP SDK 1.29, Zod, ssh2, Jest fake timers, TypeDoc.

## Global Constraints

- Preserve the existing `analyze_server` input contract and tool name.
- Emit progress only when a client supplied a progress token.
- Never persist a cancelled or partial sampled run.
- Keep MCP Tasks disabled.
- Keep all error text free of credentials, commands, and raw metric output.

---

### Task 1: Abort-aware SSH and sampling lifecycle

**Files:**
- Modify: `src/ssh.ts`
- Modify: `src/collector.ts`
- Modify: `src/types.ts`
- Test: `test/unit/ssh.test.ts`
- Test: `test/unit/collector.test.ts`

- [ ] Add red tests for cancellation during SSH connection, command execution, and inter-sample delay.
- [ ] Add exported sampling progress/control contracts.
- [ ] Propagate `AbortSignal` through collector runner and SSH session setup.
- [ ] Implement abort-aware delay with listener/timer cleanup.
- [ ] Verify focused tests and TypeScript checks.

### Task 2: MCP context, progress, and fast analysis tool

**Files:**
- Modify: `src/server-core.ts`
- Modify: `src/types.ts`
- Modify: `src/index.ts`
- Test: `test/unit/mcp.test.ts`
- Test: `test/integration/tool-flow.test.ts`

- [ ] Add red tests for the new fast tool, progress notifications, cancellation errors, and no persistence after cancellation.
- [ ] Extend internal tool handlers with optional request context.
- [ ] Adapt SDK `RequestHandlerExtra` into the internal context.
- [ ] Add `analyze_server_snapshot` without changing `analyze_server` input semantics.
- [ ] Verify tool output schemas and remote-safe schemas.

### Task 3: Metadata, docs, and governance

**Files:**
- Modify: `mcp.json`
- Modify: `README.md`
- Modify: `docs/usage.md`
- Modify: `docs/testing.md`
- Modify: `docs/compliance/mcp-2025-11-25.md`
- Modify: `docs/security-threat-model.md`
- Modify: `security/threat-model.json`
- Modify: `package.json`
- Regenerate: `docs/api/**`

- [ ] Publish the additive tool metadata and transport-specific timeout guidance.
- [ ] Add cancellation/resource-cleanup threat-model assertions.
- [ ] Add focused progress/cancellation tests to the abuse and quick gates.
- [ ] Regenerate API docs and verify metadata parity.

### Task 4: Full verification and PR

- [ ] Run lint, focused tests, full coverage, abuse, metadata, docs, package, audit, OSV, Semgrep, actionlint, and zizmor.
- [ ] Commit in reviewable units and push the branch.
- [ ] Open a PR closing #51.
- [ ] Inspect every bot comment, review, inline thread, and security result; fix actionable findings.
- [ ] Merge only after all protected checks are green.
