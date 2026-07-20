# Client setup recipes

This guide collects copy-paste setup patterns for common MCP clients and agent hosts. Keep secrets out of tool input when the server is exposed beyond a trusted local desktop.

## Recommended modes

| Client or host | Recommended transport | Recommended profile | Notes |
| --- | --- | --- | --- |
| Local stdio MCP clients | `stdio` | `full` | Best for a trusted workstation where raw SSH credentials never leave the local client. |
| Claude Desktop | `stdio` | `full` | Use `npx -y infra-lens-mcp` and a local SQLite DB path. |
| Cursor, Windsurf, VS Code MCP clients | `stdio` | `full` | Use the same stdio command and environment values as Claude Desktop. |
| ChatGPT or public remote connectors | Streamable HTTP | `remote-safe`, `chatgpt`, or `claude` | Put the Node process behind an OAuth-aware HTTPS gateway and use host/origin allowlists. |
| CI or automation runners | `stdio` or guarded HTTP | `remote-safe` | Prefer SSH agent, known hosts, pinned host keys, and allowlists. |

## Local stdio

```json
{
  "mcpServers": {
    "infra-lens": {
      "command": "npx",
      "args": ["-y", "infra-lens-mcp"],
      "env": {
        "INFRA_LENS_DB": "/Users/you/.infra-lens-mcp/metrics.db"
      }
    }
  }
}
```

Use this mode for local Claude Desktop, Cursor, Windsurf, VS Code, and other desktop clients that launch MCP servers as subprocesses.

## Claude Desktop

Add the `infra-lens` server to your Claude Desktop MCP config. Keep the transport on stdio and let the desktop client own the subprocess lifecycle.

```json
{
  "mcpServers": {
    "infra-lens": {
      "command": "npx",
      "args": ["-y", "infra-lens-mcp"],
      "env": {
        "INFRA_LENS_DB": "/Users/you/.infra-lens-mcp/metrics.db",
        "MCP_PROFILE": "full"
      }
    }
  }
}
```

Security notes:

- Keep `MCP_PROFILE=full` only for trusted local desktop usage.
- Prefer `knownHostsPath` or `hostKeySha256` for SSH targets.
- Avoid storing raw SSH secrets in shared project files.

## Cursor, Windsurf, and VS Code style clients

Most editor MCP clients accept the same stdio command shape:

```json
{
  "mcpServers": {
    "infra-lens": {
      "command": "npx",
      "args": ["-y", "infra-lens-mcp"],
      "env": {
        "INFRA_LENS_DB": "${HOME}/.infra-lens-mcp/metrics.db",
        "MCP_PROFILE": "full"
      }
    }
  }
}
```

Editor-specific file locations differ. Keep this repository's server settings stable and adapt only the wrapper location required by the client.

## ChatGPT or other remote HTTP hosts

Remote HTTP should not receive raw SSH passwords, private keys, or passphrases in tool input. Use a remote-safe profile and an upstream OAuth-aware HTTPS gateway.

Example backend process command and environment (`server-http.js` is the transport selector):

```bash
MCP_PROFILE=chatgpt \
MCP_HTTP_HOST=127.0.0.1 \
MCP_HTTP_PORT=3000 \
MCP_HTTP_ENDPOINT_PATH=/mcp \
MCP_HTTP_AUTH_MODE=oauth-gateway \
MCP_HTTP_OAUTH_GATEWAY_SECRET=replace-with-a-secret \
MCP_HTTP_ALLOWED_ORIGINS=https://chatgpt.com \
MCP_HTTP_ALLOWED_HOSTS=infra-lens.example.com \
MCP_SSH_ALLOWED_HOSTS=10.0.0.0/24,server.example.com \
node dist/server-http.js
```

Gateway requirements:

- Terminate HTTPS before requests reach the Node process.
- Validate user identity and authorization outside this package.
- Inject the configured gateway secret header only after successful authorization.
- Block direct internet access to the Node process.
- Preserve strict Host and Origin allowlists.

## SSH input examples

Pinned host key input:

```json
{
  "connection": {
    "host": "server.example.com",
    "port": 22,
    "username": "deploy",
    "hostKeySha256": "SHA256:replace-with-real-fingerprint"
  },
  "include_processes": true,
  "include_network": true
}
```

Known hosts input:

```json
{
  "connection": {
    "host": "server.example.com",
    "port": 22,
    "username": "deploy",
    "knownHostsPath": "/Users/you/.ssh/known_hosts"
  }
}
```

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Client cannot start the server | Confirm Node 22+ and `npx -y infra-lens-mcp` work in the same shell. |
| HTTP remote mode fails fast | Configure remote-safe profile, auth mode, allowed origins, and allowed hosts. |
| SSH connection rejected | Check `MCP_SSH_ALLOWED_HOSTS`, username/port allowlists, and host key settings. |
| Empty or partial metrics | Run `inspect_host_capabilities` first and review `warnings`. |
| MCP client cannot parse output | Use `structuredContent`; all tools also return readable JSON text for compatibility. |

## Related docs

- [Usage](../usage.md)
- [Security](../security.md)
- [MCP 2025-11-25 compliance matrix](../compliance/mcp-2025-11-25.md)
- [OAuth gateway ADR](../adr/0006-oauth-gateway-strategy.md)
