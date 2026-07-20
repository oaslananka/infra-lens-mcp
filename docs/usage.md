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

## Tool outputs

Every tool returns a backward-compatible JSON text block and the same payload as MCP `structuredContent`. Each tool also declares an `outputSchema`, allowing MCP clients to validate and consume machine-readable fields directly. Collector-backed outputs include `warnings` when optional sections degrade gracefully.

For example, `analyze_server` exposes typed fields such as `host`, `timestamp`, `collection_window_minutes`, `health_score`, `summary`, `anomalies`, and `metrics`. `get_history` exposes `data_points` and a `history` array of `{ timestamp, value }` points for charting or follow-up reasoning.

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
- `network[].rx_packets`, `network[].tx_packets`, `network[].rx_errors`, `network[].tx_errors`, `network[].rx_dropped`, and `network[].tx_dropped` expose NIC or upstream packet quality problems.
- `system.failed_units` and `system.kernel_error_events` summarize service failures and recent kernel-level error signals.

`analyze_server` reports these as `disk_inode:*`, `network:*`, `system:failed_units`, and `system:kernel_errors` anomalies when they indicate operational risk. The fields are also returned in `structuredContent` for agent-friendly triage.
