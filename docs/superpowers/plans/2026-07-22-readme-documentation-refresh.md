# README Showcase and Documentation Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the README opening with a professional centered project showcase and correct public documentation that no longer matches the 1.5.0 repository state.

**Architecture:** Keep the repository documentation-only: the README hero uses GitHub-compatible HTML and truthful external badges, while a new `docs/README.md` becomes the navigation hub. Correct the compliance matrix and roadmap without changing runtime behavior, package metadata, workflow definitions, or connector publication readiness.

**Tech Stack:** GitHub Flavored Markdown, inline HTML supported by GitHub README rendering, Shields.io/public workflow badges, existing Node.js documentation validation scripts.

## Global Constraints

- Do not claim public connector readiness; `connector_readiness.publishReady` remains `false`.
- Use only badge targets backed by active workflows or public package metadata.
- Preserve all ten current MCP tools in the README inventory.
- Do not change runtime TypeScript, dependency manifests, workflow behavior, or release version.
- Current-state docs must not present closed issues #48, #52, #53, #63, or #67 as unresolved blockers.
- Keep `docs/superpowers` excluded from the npm package.

---

### Task 1: Add the centered README showcase

**Files:**
- Modify: `README.md:1-30`

**Interfaces:**
- Consumes: active workflow filenames under `.github/workflows`, npm package name `infra-lens-mcp`, repository owner/name `oaslananka/infra-lens-mcp`.
- Produces: a GitHub-renderable hero with status, distribution, navigation, and support links.

- [ ] **Step 1: Capture the current README opening**

Run:

```bash
sed -n '1,55p' README.md
```

Expected: the file begins with `# infra-lens-mcp`, followed immediately by the support image and five ungrouped badges.

- [ ] **Step 2: Replace the opening with the approved balanced hero**

Use this structure, preserving exact repository and workflow paths:

```html
<div align="center">

# infra-lens-mcp

**Explain Linux incidents over SSH with baseline-aware MCP tooling.**

A TypeScript MCP server for live Linux diagnostics, local SQLite history,
review-first incident workflows, and secure observability exports.

[![CI](https://github.com/oaslananka/infra-lens-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/oaslananka/infra-lens-mcp/actions/workflows/ci.yml)
[![CodeQL](https://github.com/oaslananka/infra-lens-mcp/actions/workflows/codeql.yml/badge.svg)](https://github.com/oaslananka/infra-lens-mcp/actions/workflows/codeql.yml)
[![Security](https://github.com/oaslananka/infra-lens-mcp/actions/workflows/security.yml/badge.svg)](https://github.com/oaslananka/infra-lens-mcp/actions/workflows/security.yml)
[![OSV-Scanner](https://github.com/oaslananka/infra-lens-mcp/actions/workflows/osv-scanner-full.yml/badge.svg)](https://github.com/oaslananka/infra-lens-mcp/actions/workflows/osv-scanner-full.yml)
[![codecov](https://codecov.io/gh/oaslananka/infra-lens-mcp/graph/badge.svg)](https://codecov.io/gh/oaslananka/infra-lens-mcp)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/oaslananka/infra-lens-mcp/badge)](https://securityscorecards.dev/viewer/?uri=github.com/oaslananka/infra-lens-mcp)

[![npm version](https://img.shields.io/npm/v/infra-lens-mcp.svg)](https://www.npmjs.com/package/infra-lens-mcp)
[![npm downloads](https://img.shields.io/npm/dm/infra-lens-mcp.svg)](https://www.npmjs.com/package/infra-lens-mcp)
[![Node.js >=22](https://img.shields.io/badge/Node.js-%3E%3D22-339933.svg)](https://nodejs.org/)
[![MCP 2025-11-25](https://img.shields.io/badge/MCP-2025--11--25-6f42c1.svg)](./docs/compliance/mcp-2025-11-25.md)
[![GHCR signed multi-arch](https://img.shields.io/badge/GHCR-signed%20multi--arch-2496ED.svg)](https://github.com/oaslananka/infra-lens-mcp/pkgs/container/infra-lens-mcp)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

[Documentation](./docs/README.md) · [Usage](./docs/usage.md) · [Architecture](./docs/architecture.md) · [Security](./SECURITY.md) · [Governance](./docs/governance.md) · [Roadmap](./ROADMAP.md) · [Support](./SUPPORT.md) · [Releases](https://github.com/oaslananka/infra-lens-mcp/releases)

<a href="https://www.buymeacoffee.com/oaslananka">
  <img src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=%E2%98%95&slug=oaslananka&button_colour=FFDD00&font_colour=000000&font_family=Arial&outline_colour=000000&coffee_colour=ffffff" alt="Buy me a coffee" />
</a>

</div>
```

Follow it with one non-centered paragraph explaining SSH collection, SQLite history, baselines, anomaly analysis, review-first remediation, and the separation between package readiness and public connector readiness.

- [ ] **Step 3: Verify README inventory and links**

Run:

```bash
node scripts/check-doc-links.mjs
node - <<'NODE'
const fs = require('node:fs');
const text = fs.readFileSync('README.md', 'utf8');
const required = [
  'analyze_server',
  'analyze_server_snapshot',
  'snapshot',
  'record_baseline',
  'compare_to_baseline',
  'get_history',
  'inspect_host_capabilities',
  'plan_remediation',
  'draft_incident_report',
  'compare_incident_windows'
];
for (const name of required) {
  if (!text.includes('`' + name + '`')) throw new Error('Missing tool: ' + name);
}
console.log(`README tool inventory passed: ${required.length} tools.`);
NODE
```

Expected: link check exits 0 and reports `README tool inventory passed: 10 tools.`

- [ ] **Step 4: Commit the showcase**

```bash
git add README.md
git commit -m "docs(readme): add project showcase header"
```

### Task 2: Create the documentation index

**Files:**
- Create: `docs/README.md`
- Modify: `README.md` development/documentation paragraph

**Interfaces:**
- Consumes: existing public documents under `docs`, root community files, and examples.
- Produces: one canonical navigation page linked from the README hero.

- [ ] **Step 1: Write `docs/README.md`**

The document must contain these exact sections and links:

```markdown
# Documentation

Use this page as the map for `infra-lens-mcp` documentation. Package readiness and public connector readiness are separate; see the compliance and release documents before deploying HTTP mode publicly.

## Start here

- [Usage guide](./usage.md)
- [Client setup](./integrations/client-setup.md)
- [Architecture](./architecture.md)
- [MCP 2025-11-25 compliance](./compliance/mcp-2025-11-25.md)

## Operate and investigate

- [Operations](./operations.md)
- [Incident workflows](./incident-workflows.md)
- [Observability exports](./observability.md)
- [SQLite storage lifecycle](./storage-lifecycle.md)
- [Reviewed incident examples](../examples/incidents/README.md)

## Security and governance

- [Security notes](./security.md)
- [Threat model](./security-threat-model.md)
- [Governance](./governance.md)
- [Repository controls](./governance/repository-controls.md)
- [Roadmap](../ROADMAP.md)
- [Support](../SUPPORT.md)

## Develop and release

- [Testing](./testing.md)
- [Node support policy](./compatibility/node-support.md)
- [Release guide](./release.md)
- [Release state machine](./release-state-machine.md)
- [Architecture decision records](./adr/README.md)
- [Generated API reference](./api/README.md)
- [Agent runtime configuration](./agent-runtime-config.md)
- [Review-thread gate](./automation/review-thread-gate.md)
- [Failure classifier](./automation/failure-classifier.md)
```

- [ ] **Step 2: Replace the README documentation link list with the index**

Keep direct links for the most operationally important documents, but lead with `[Documentation index](./docs/README.md)` and remove redundant prose that enumerates nearly every document in one sentence.

- [ ] **Step 3: Verify navigation**

Run:

```bash
pnpm run docs:links:check
```

Expected: exit 0 with no broken local link.

- [ ] **Step 4: Commit the index**

```bash
git add README.md docs/README.md
git commit -m "docs: add documentation index"
```

### Task 3: Correct the MCP compliance matrix

**Files:**
- Modify: `docs/compliance/mcp-2025-11-25.md`

**Interfaces:**
- Consumes: current HTTP behavior, completed issue state, threat-model suite, and connector guide.
- Produces: a current-state compliance table with no closed issue presented as an open blocker.

- [ ] **Step 1: Update the stale rows**

Apply these exact semantic changes:

```markdown
| Streamable HTTP transport | Partial | Stateless POST transport, request policy, progress-capable tool handlers, and integration tests are implemented | Future product decision for stateful GET/SSE and DELETE lifecycle |
| HTTP GET/SSE behavior | Unsupported | GET returns 405 because a standalone server-to-client SSE stream is intentionally not exposed | Future issue only if stateful streaming becomes product scope |
| Origin validation | Supported | `src/http-security.ts` validates allowed origins for guarded HTTP profiles | None |
| Localhost-first binding | Supported | Default HTTP host is loopback and non-loopback startup fails closed without the required controls | None |
| Bearer token mode | Supported for local/dev | Constant-time local bearer validation is implemented and tested; production identity is delegated to an OAuth-aware gateway | None |
| Security threat model | Supported | Machine-readable threat register, accepted-risk records, and the executable `test:abuse` suite | None |
| Connector documentation | Supported | Client recipes cover ChatGPT, Claude, Cursor, VS Code, local stdio, and guarded HTTP deployment | Public connector publication still requires a verified external OAuth/HTTPS deployment |
```

Replace the obsolete final instruction with:

```markdown
Do not change `connector_readiness.publishReady` to `true` until the external production OAuth/HTTPS gateway is deployed and verified, and no `accepted-blocker` threat remains.
```

- [ ] **Step 2: Verify stale issue references are removed**

Run:

```bash
if rg -n '#(48|52|53|63|67)\b' docs/compliance/mcp-2025-11-25.md; then
  echo 'Closed issue remains as an unresolved compliance reference.' >&2
  exit 1
fi
```

Expected: no output and exit 0.

- [ ] **Step 3: Commit compliance corrections**

```bash
git add docs/compliance/mcp-2025-11-25.md
git commit -m "docs(compliance): remove completed follow-up references"
```

### Task 4: Refresh the roadmap

**Files:**
- Modify: `ROADMAP.md`

**Interfaces:**
- Consumes: shipped 1.5.0 capabilities and the repository's review-first/no-autonomous-remediation policy.
- Produces: a current roadmap that distinguishes shipped capabilities, current maintenance, later exploration, and explicit non-goals.

- [ ] **Step 1: Rewrite the roadmap**

Use these sections:

```markdown
# Roadmap

The roadmap communicates direction, not a release commitment. Security, compatibility, and reliability work may take priority over feature sequencing.

## Shipped foundation

- Sampled and immediate server analysis with MCP progress and cancellation
- Strict SSH host verification and remote-safe target policy
- SQLite observations, approved baselines, retention, pagination, and export
- Robust anomaly explanations and reviewed incident fixtures
- Review-first remediation plans, incident drafts, and window comparison
- OpenMetrics and OTLP exports from persisted observations
- Signed multi-architecture GHCR images and provenance-backed npm releases

## Current focus

- Keep Node, MCP SDK, SSH, SQLite, and security-tool dependencies current
- Improve Linux metric fidelity and anomaly evidence without expanding secret collection
- Improve operator documentation, examples, and client interoperability
- Maintain deterministic security, package, performance, and release gates

## Later exploration

- Fleet-level analysis and ranked multi-host summaries
- Host grouping and fleet history comparisons
- Alert delivery integrations with deduplication and explicit operator ownership
- Optional stateful HTTP streaming only if client demand justifies the added lifecycle and authorization complexity

## Non-goals

- Autonomous remediation or command execution from model-generated recommendations
- Built-in web UI
- Windows hosts as monitoring targets
- Push-based agents installed on monitored hosts
```

- [ ] **Step 2: Verify obsolete future-version headings are gone**

Run:

```bash
if rg -n '^## v(1\.1\.0|1\.2\.0|1\.3\.0|2\.0\.0)' ROADMAP.md; then
  echo 'Obsolete version roadmap headings remain.' >&2
  exit 1
fi
```

Expected: no output and exit 0.

- [ ] **Step 3: Commit the roadmap**

```bash
git add ROADMAP.md
git commit -m "docs(roadmap): align plans with current product state"
```

### Task 5: Run repository documentation and package gates

**Files:**
- Modify only if a validation command identifies a documentation defect.

**Interfaces:**
- Consumes: all changes from Tasks 1-4.
- Produces: verified documentation suitable for a public pull request.

- [ ] **Step 1: Run the focused documentation gates**

```bash
pnpm run docs:links:check
pnpm run docs:api:check
pnpm run check:metadata
pnpm run check:threat-model
```

Expected: all commands exit 0.

- [ ] **Step 2: Run lint and packaging gates**

```bash
pnpm run lint
pnpm run build
pnpm run check:package-size
pnpm run check:licenses
npm pack --dry-run
```

Expected: all commands exit 0 and package limits remain within policy.

- [ ] **Step 3: Run workflow path/security validation**

```bash
pnpm run workflow:check
```

If the repository-managed pre-commit executable is unavailable on the worker, run the pinned actionlint and zizmor binaries directly using the versions declared in `.pre-commit-config.yaml` and require zero findings.

- [ ] **Step 4: Run final documentation assertions**

```bash
node scripts/check-doc-links.mjs
if rg -n '#(48|52|53|63|67)\b' docs/compliance/mcp-2025-11-25.md; then exit 1; fi
node - <<'NODE'
const fs = require('node:fs');
const readme = fs.readFileSync('README.md', 'utf8');
for (const marker of ['actions/workflows/ci.yml/badge.svg', './docs/README.md', 'GHCR-signed%20multi--arch']) {
  if (!readme.includes(marker)) throw new Error('README showcase marker missing: ' + marker);
}
console.log('README showcase assertions passed.');
NODE
git diff --check
```

Expected: assertions pass and `git diff --check` emits no output.

- [ ] **Step 5: Commit validation-only corrections if needed**

```bash
git add README.md ROADMAP.md docs
if ! git diff --cached --quiet; then
  git commit -m "docs: finalize documentation refresh"
fi
```
