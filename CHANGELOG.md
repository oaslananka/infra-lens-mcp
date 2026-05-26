# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.3](https://github.com/oaslananka/infra-lens-mcp/compare/mcp-infra-lens-v1.0.2...mcp-infra-lens-v1.0.3) (2026-05-26)


### Bug Fixes

* **packaging:** align npm metadata with repository ([fba380a](https://github.com/oaslananka/infra-lens-mcp/commit/fba380a0cc0618c788a3afbd5c34888a546f80d2))
* **security:** clear dependency and code scanning alerts ([7c73371](https://github.com/oaslananka/infra-lens-mcp/commit/7c733712f8e7f27f25d370d69b562e2c6b0b87b9))

## [Unreleased]

### Added

- Multi-sample collection mode for `analyze_server`, so `duration_minutes` now reflects real sampling
- Configurable anomaly thresholds via `AnalysisThresholds` and `DEFAULT_THRESHOLDS`
- Parallel SSH command execution for lower snapshot latency
- Graceful SIGTERM and SIGINT shutdown handling for stdio and HTTP transports
- Contributor, security, architecture, testing, and roadmap documentation

### Changed

- `get_history` now supports optional label filtering
- `mcp.json` is now publication and MCP Registry ready
- README rewritten with integration, Docker, configuration, and demo sections

### Fixed

- All structured logs now route to `stderr`, protecting the MCP stdio wire protocol
- Docker image rebuilds `better-sqlite3` in both stages for runtime compatibility
- Vendored Zod removed in favor of the npm dependency to avoid duplicated publish output

## [1.0.2] - 2026-04-08

### Fixed

- npm runtime dependencies now align with the current source release (`@modelcontextprotocol/sdk@1.29.0`, `better-sqlite3@12.8.0`)
- Resolved Node 24 installation failures from the previously published 1.0.1 artifact

## [1.0.1] - 2026-04-07

### Added

- `mcpName` package metadata for MCP Registry verification
- `server.json` manifest for `mcp-publisher`
- GitHub package metadata and publish surface updates for registry submission

### Fixed

- Follow-up release metadata needed for direct MCP Registry publication after the initial npm launch

## [1.0.0] - 2026-04-06

### Added

- SSH-based Linux metric collection for CPU, memory, disk, network, process, and OS data
- Baseline recording and CPU z-score anomaly detection
- Five MCP tools: `analyze_server`, `snapshot`, `record_baseline`, `compare_to_baseline`, `get_history`
- Local SQLite history with WAL mode enabled
- MCP stdio and Streamable HTTP transports
- Azure DevOps CI/CD scaffold
- Multi-stage Docker build
- Unit tests for analyzer, collector, baseline, and tool registration
