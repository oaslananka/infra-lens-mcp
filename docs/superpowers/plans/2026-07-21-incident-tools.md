# Incident Tools Implementation Plan

1. Add bounded persisted observation-window queries with invalid-row accounting.
2. Add pure remediation plan, incident draft, window summary, and comparison builders with focused tests.
3. Add strict Zod input/output schemas and register three read-only MCP tools.
4. Update published MCP metadata and integration tests.
5. Document safety and workflows, extend threat-model evidence, regenerate API docs, and run full gates.
6. Open a PR closing #58, inspect all bot/agent feedback, fix findings, and merge only when green.
