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

- Keep Node.js, the MCP SDK, SSH, SQLite, and security-tool dependencies current
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
