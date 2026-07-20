# Client setup recipes

This guide provides copy-paste configurations for local MCP clients and guarded remote hosts. Never place SSH private keys, passwords, passphrases, bearer tokens, or gateway secrets in committed project files.

## Choose a deployment mode

| Client or host | Transport | Profile | Configuration location |
| --- | --- | --- | --- |
| Claude Desktop | stdio | `full` | Claude Desktop developer configuration |
| Cursor | stdio | `full` | `.cursor/mcp.json` or `~/.cursor/mcp.json` |
| Windsurf Cascade | stdio | `full` | `~/.codeium/windsurf/mcp_config.json` |
| VS Code MCP | stdio | `full` | `.vscode/mcp.json` |
| ChatGPT custom app | Streamable HTTP over HTTPS | `chatgpt` | Settings or workspace settings → Apps → Create |
| CI or private automation | stdio or guarded HTTP | `remote-safe` | Secret-managed runner configuration |

The executable selects the transport. `npx -y infra-lens-mcp` starts stdio. `node dist/server-http.js` starts Streamable HTTP. There is no transport environment switch.

## Shared stdio definition

```json
{
  "mcpServers": {
    "infra-lens": {
      "command": "npx",
      "args": ["-y", "infra-lens-mcp"],
      "env": {
        "INFRA_LENS_DB": "/absolute/path/to/metrics.db",
        "MCP_PROFILE": "full"
      }
    }
  }
}
```

Use an absolute SQLite path. Keep SSH host verification strict through `knownHostsPath` or `hostKeySha256` in tool input, and use an SSH agent instead of embedding key material.

## Claude Desktop

Open Claude Desktop developer settings and add the shared stdio definition. Typical local configuration paths are:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Restart Claude Desktop after changing the file. Managed environments can restrict local development MCP access through enterprise policy.

## Cursor

Create `.cursor/mcp.json` for a project-specific server or `~/.cursor/mcp.json` for a global server. Paste the shared stdio definition, then verify it through Cursor's MCP settings or `cursor-agent mcp list`.

## Windsurf Cascade

Edit `~/.codeium/windsurf/mcp_config.json`, or open Settings → Tools → Windsurf Settings → Add Server → View Raw Config. Paste the shared stdio definition and refresh the MCP list after saving.

## VS Code

Copy `.vscode/mcp.example.json` to `.vscode/mcp.json`. Keep the real file local when it contains machine-specific paths. The repository example uses the same `npx -y infra-lens-mcp` command as the other stdio clients.

## ChatGPT custom app

ChatGPT connects to a remote MCP endpoint, not directly to a local stdio process. Enable developer mode for an eligible account or workspace, go to Apps → Create, enter the HTTPS MCP endpoint, select the configured authentication method, and scan tools. A private-network deployment can use a supported secure tunnel instead of exposing the Node process directly.

Run the backend only on loopback or a private interface:

```bash
MCP_PROFILE=chatgpt \
MCP_HTTP_HOST=127.0.0.1 \
MCP_HTTP_PORT=3000 \
MCP_HTTP_ENDPOINT_PATH=/mcp \
MCP_HTTP_AUTH_MODE=oauth-gateway \
MCP_HTTP_OAUTH_GATEWAY_SECRET=replace-from-secret-manager \
MCP_HTTP_ALLOWED_ORIGINS=https://chatgpt.com \
MCP_HTTP_ALLOWED_HOSTS=infra-lens.example.com \
MCP_SSH_ALLOWED_HOSTS=10.0.0.0/24,server.example.com \
node dist/server-http.js
```

### Nginx gateway example

```nginx
server {
  listen 443 ssl http2;
  server_name infra-lens.example.com;

  location = /mcp {
    proxy_pass http://127.0.0.1:3000/mcp;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header Origin $http_origin;
    proxy_set_header Authorization $http_authorization;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_request_buffering off;
  }
}
```

The OAuth-aware layer must authenticate and authorize the user before injecting `MCP_HTTP_OAUTH_GATEWAY_HEADER` with the configured shared gateway secret. Do not accept that header from the public client.

### Caddy gateway example

```caddyfile
infra-lens.example.com {
  @mcp path /mcp
  reverse_proxy @mcp 127.0.0.1:3000 {
    header_up Host {host}
    header_up Origin {header.Origin}
    header_up Authorization {header.Authorization}
    header_up X-Forwarded-Proto https
  }
}
```

Place identity enforcement before `reverse_proxy`, block direct internet access to port 3000, and preserve the original Host and Origin values so application allowlists remain effective.

## SSH input examples

Pinned host key:

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

Known hosts:

```json
{
  "connection": {
    "host": "server.example.com",
    "port": 22,
    "username": "deploy",
    "knownHostsPath": "/absolute/path/to/known_hosts"
  }
}
```

## Troubleshooting

| Symptom | Resolution |
| --- | --- |
| Desktop client cannot launch the server | Run `node --version` and `npx -y infra-lens-mcp` in the same user environment; Node 22+ is required. |
| Client shows no tools | Restart or refresh the client, confirm the key is `mcpServers`, and ensure the process writes protocol messages only to stdout. |
| Remote tool scan fails | Confirm the public URL ends in `/mcp`, HTTPS is valid, the gateway permits POST, and Host, Origin, and auth values survive proxying. |
| HTTP server rejects the request | Match `MCP_HTTP_ALLOWED_HOSTS`, `MCP_HTTP_ALLOWED_ORIGINS`, auth mode, endpoint path, and gateway header settings. |
| SSH connection is rejected | Check host, user, and port allowlists and provide `knownHostsPath` or `hostKeySha256`. |
| Metrics are partial | Run `inspect_host_capabilities` and review `warnings`; optional unsupported signals are reported rather than fabricated. |
| ChatGPT cannot connect to localhost | Deploy remotely or use a supported secure MCP tunnel; ChatGPT does not directly launch the local stdio process. |

## Upstream references

- [OpenAI: developer mode and custom MCP apps](https://help.openai.com/en/articles/12584461-developer-mode-apps-and-full-mcp-connectors-in-chatgpt-beta)
- [Anthropic: Claude Desktop local MCP servers](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop)
- [Cursor: MCP configuration](https://docs.cursor.com/context/model-context-protocol)
- [Windsurf: Cascade MCP integration](https://docs.windsurf.com/windsurf/cascade/mcp)

## Related documentation

- [Usage](../usage.md)
- [Security](../security.md)
- [Node support](../compatibility/node-support.md)
- [MCP compliance](../compliance/mcp-2025-11-25.md)
- [OAuth gateway ADR](../adr/0006-oauth-gateway-strategy.md)
