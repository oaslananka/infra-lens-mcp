# Progress and Cancellation Design

## Goal

Make long sampled analysis safe for interactive MCP clients without breaking the existing `analyze_server` input contract.

## Tool model

- Keep `analyze_server` as the backward-compatible sampled analysis tool.
- Add `analyze_server_snapshot` for one immediate collection and analysis pass.
- Both tools persist only a successfully completed observation.
- Sampled output identifies `collection_mode: sampled`; snapshot output identifies `collection_mode: snapshot` and a zero-minute window.

## Request context

Tool handlers accept a transport-neutral request context containing an optional `AbortSignal` and an optional progress reporter. The MCP registration adapter derives these from SDK `RequestHandlerExtra`:

- `extra.signal` becomes the cancellation signal.
- Progress is sent only when `_meta.progressToken` exists.
- Progress notifications use the same token, completed sample count, total sample count, and a bounded message without credentials or raw metrics.

Tests can invoke handlers without a context, preserving the existing internal registrar API.

## Collector lifecycle

`collectSampledSnapshot` accepts optional sampling control:

- abort before starting a sample;
- pass the signal into single-snapshot collection and the SSH runner;
- report progress after each completed sample;
- use an abort-aware delay between samples;
- remove abort listeners and clear timers on resolve, reject, or cancellation.

SSH connection setup and command execution observe the same signal. Aborting closes the stream/client, rejects with an `AbortError`, releases the per-host concurrency slot, and closes the session through existing `finally` cleanup.

## Cancellation result

A cancelled tool call returns an MCP error result with a short stable message and no structured payload. The handler rechecks the signal before analysis and persistence, so a late cancellation cannot write a partial observation.

## Timeouts

- stdio has no server-owned wall-clock request timeout; the client controls request timeout and sends MCP cancellation.
- Streamable HTTP additionally has the Node request/socket timeout configured by `MCP_HTTP_REQUEST_TIMEOUT_MS`; clients and reverse proxies must use a timeout longer than the sampled window or use the snapshot tool.
- SSH commands keep their bounded command timeout; cancellation can end them earlier.

## Non-goals

- MCP Tasks are not enabled.
- Runs are not resumed after disconnect.
- Partial samples are not persisted or returned.
- No new background job database is introduced.
