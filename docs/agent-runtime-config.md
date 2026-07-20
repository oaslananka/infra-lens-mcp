# Agent Runtime Configuration

This document gives copyable configuration examples for running `infra-lens-mcp` from popular MCP-capable agent runtimes.

## Claude Code

```bash
claude plugin validate .
claude --plugin-dir .
```

## Codex CLI

Copy `.codex/config.example.toml` into your Codex config.

## VS Code / GitHub Copilot

Use `.vscode/mcp.example.json` as a workspace MCP configuration example.

## OpenCode

Copy `opencode.example.jsonc` to `opencode.json`, or merge the `mcp` block into an existing OpenCode config. OpenCode skills are mirrored under `.opencode/skills/`.

## Generic MCP clients

Use the stdio package entry point:

```bash
npx -y infra-lens-mcp
```

For guarded Streamable HTTP, invoke the HTTP entry point explicitly:

```bash
node dist/server-http.js
```

No transport environment variable is supported; the selected executable is the transport contract.

## Safety

`infra-lens-mcp` is a visibility and diagnostics assistant. Keep inspection read-only unless a separate approved operational tool is used for remediation.
