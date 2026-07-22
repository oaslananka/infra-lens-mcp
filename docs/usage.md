# Usage Guide

## Connection inputs

Default `full` profile inputs may include local SSH credentials:

```json
{
  "connection": {
    "host": "app-01.internal",
    "username": "ops",
    "privateKey": "<redacted-private-key-material>",
    "hostKeySha256": "SHA256:..."
  }
}
```

For `remote-safe`, `chatgpt`, and `claude` profiles, raw `password`, `privateKey`, and `passphrase` fields are rejected. Use an external SSH agent or gateway-managed credentials and set `MCP_SSH_ALLOWED_HOSTS`.


## Inspect host capabilities

Use `inspect_host_capabilities` before onboarding a new host or minimal container image. The tool reports whether required files and commands such as `/proc/stat`, `/proc/loadavg`, `/proc/net/dev`, `free`, `df`, `awk`, `ps`, and `uname` are available. Missing optional capabilities are returned as structured warnings so an agent can explain degraded collection before attempting analysis.

```json
{
  "connection": {
    "host": "server.example.com",
    "port": 22,
    "username": "ops",
    "hostKeySha256": "SHA256:..."
  }
}
```

## Analyze a server

Use `analyze_server_snapshot` for a fast point-in-time analysis:

```json
{
  "connection": {
    "host": "app-01.internal",
    "username": "ops",
    "hostKeySha256": "SHA256:..."
  },
  "include_processes": true,
  "include_network": true
}
```

Use the backward-compatible `analyze_server` tool when a sampled window is required:


```json
{
  "connection": {
    "host": "app-01.internal",
    "username": "ops",
    "hostKeySha256": "SHA256:..."
  },
  "duration_minutes": 5,
  "include_processes": true,
  "include_network": true
}
```

`include_processes=false` skips process collection. `include_network=false` skips network collection. These flags prevent collection at the SSH command layer, not just response rendering.

When the client includes `_meta.progressToken`, sampled analysis sends `notifications/progress` after every completed sample. A client cancellation aborts the next delay or active SSH operation, closes the SSH resources, and returns an MCP error result. Partial samples are discarded and never written to SQLite.

### Transport timeout behavior

- **stdio:** the server does not impose a wall-clock request timeout. Configure the MCP client timeout to exceed `duration_minutes`, and let the client send MCP cancellation when the user stops the request.
- **Streamable HTTP:** `MCP_HTTP_REQUEST_TIMEOUT_MS`, reverse-proxy timeouts, and client timeouts must all exceed the sampled window plus SSH command overhead. The default 30-second HTTP timeout is intentionally suited to snapshot tools, not multi-minute sampling.
- **SSH:** each remote command retains its bounded command timeout; MCP cancellation can close the stream and session earlier.

## Tool outputs

Every tool returns a backward-compatible JSON text block and the same payload as MCP `structuredContent`. Each tool also declares an `outputSchema`, allowing MCP clients to validate and consume machine-readable fields directly. Collector-backed outputs include `warnings` when optional sections degrade gracefully.

For example, both analysis tools expose typed fields such as `host`, `timestamp`, `collection_mode`, `collection_window_minutes`, `samples_collected`, `health_score`, `summary`, `anomalies`, and `metrics`. `get_history` exposes `data_points` and a `history` array of `{ timestamp, value }` points for charting or follow-up reasoning.

## Record a baseline

```json
{
  "connection": {
    "host": "app-01.internal",
    "username": "ops",
    "knownHostsPath": "/Users/you/.ssh/known_hosts"
  },
  "label": "weekday-normal"
}
```

Repeat baseline collection during verified healthy windows. Only `record_baseline` creates baseline samples; `snapshot` and `analyze_server` store observations and never change baseline sample counts. CPU z-score anomaly detection activates after at least five approved samples and becomes more useful around ten samples.

## Compare to baseline

```json
{
  "connection": {
    "host": "app-01.internal",
    "username": "ops",
    "hostKeySha256": "SHA256:..."
  },
  "baseline_label": "weekday-normal"
}
```

## Get history

```json
{
  "host": "app-01.internal",
  "metric": "cpu",
  "hours": 24,
  "label": "weekday-normal"
}
```

Leave `label` unset to return operational observations for the host. Set `label` to inspect a named record stream, including an explicitly recorded baseline such as `weekday-normal`. Baseline records are excluded from unlabeled operational history and from all baseline calculations unless they were created by `record_baseline`.

## Expanded Linux diagnosis signals

Snapshots include additional Linux signals beyond CPU, memory, disk space, processes, and byte counters:

- `disk[].inode_total`, `disk[].inode_used`, and `disk[].inode_usage_percent` expose inode pressure for hosts that run out of file entries before space.
- `network[].rx_packets`, `network[].tx_packets`, byte counts, errors, and drops are one-second deltas. `sample_window_seconds` identifies the bounded window, while `counter_reset=true` suppresses anomaly scoring for resets or wraps.
- `system.failed_units` reports current failed services. Kernel anomalies are emitted only when `kernel_signal_available=true`; `kernel_error_events` then covers the bounded `kernel_window_minutes` window. Unsupported recent-kernel queries produce a warning instead of treating historical logs as current incidents.

`analyze_server` reports these as `disk_inode:*`, `network:*`, `system:failed_units`, and `system:kernel_errors` anomalies when they indicate operational risk. The fields are also returned in `structuredContent` for agent-friendly triage.
