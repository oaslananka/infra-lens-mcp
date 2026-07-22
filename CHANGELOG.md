# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.0](https://github.com/oaslananka/infra-lens-mcp/compare/infra-lens-mcp-v1.4.1...infra-lens-mcp-v1.5.0) (2026-07-22)


### Features

* **mcp:** add analysis progress and cancellation ([0c31bff](https://github.com/oaslananka/infra-lens-mcp/commit/0c31bff0f22171bc3e95b63c7bd263a8202d422f))

## [1.4.1](https://github.com/oaslananka/infra-lens-mcp/compare/infra-lens-mcp-v1.4.0...infra-lens-mcp-v1.4.1) (2026-07-22)


### Bug Fixes

* **security:** patch newly disclosed OSV advisories ([bb25297](https://github.com/oaslananka/infra-lens-mcp/commit/bb252979192e006adfd1fd1a74a2e83072703faa))

## [1.4.0](https://github.com/oaslananka/infra-lens-mcp/compare/infra-lens-mcp-v1.3.1...infra-lens-mcp-v1.4.0) (2026-07-21)


### Features

* **incidents:** add review-first remediation and report tools ([9cc7623](https://github.com/oaslananka/infra-lens-mcp/commit/9cc76232d44419e93569a657a4cf7ef7076b36be)), closes [#58](https://github.com/oaslananka/infra-lens-mcp/issues/58)

## [1.3.1](https://github.com/oaslananka/infra-lens-mcp/compare/infra-lens-mcp-v1.3.0...infra-lens-mcp-v1.3.1) (2026-07-21)


### Bug Fixes

* **security:** patch OSV dependency advisories ([1dc7945](https://github.com/oaslananka/infra-lens-mcp/commit/1dc794555547e8f070f922c3bde87bb428da008d)), closes [#114](https://github.com/oaslananka/infra-lens-mcp/issues/114)

## [1.3.0](https://github.com/oaslananka/infra-lens-mcp/compare/infra-lens-mcp-v1.2.0...infra-lens-mcp-v1.3.0) (2026-07-21)


### Features

* **observability:** add OpenMetrics and OTLP exports ([#110](https://github.com/oaslananka/infra-lens-mcp/issues/110)) ([0567521](https://github.com/oaslananka/infra-lens-mcp/commit/0567521de16f8da11c4fb969648eef2a99819608))

## [1.2.0](https://github.com/oaslananka/infra-lens-mcp/compare/infra-lens-mcp-v1.1.1...infra-lens-mcp-v1.2.0) (2026-07-21)


### Features

* **container:** publish signed multi-arch images ([#109](https://github.com/oaslananka/infra-lens-mcp/issues/109)) ([43f7632](https://github.com/oaslananka/infra-lens-mcp/commit/43f7632c4163197abff7f85f4642647e4bbc53aa)), closes [#61](https://github.com/oaslananka/infra-lens-mcp/issues/61)
* **storage:** add lifecycle pagination and export ([#101](https://github.com/oaslananka/infra-lens-mcp/issues/101)) ([5b4b789](https://github.com/oaslananka/infra-lens-mcp/commit/5b4b78905d484ccbdc58622c87240b9550d0f62b))


### Bug Fixes

* **analyzer:** bound network and kernel signals ([#100](https://github.com/oaslananka/infra-lens-mcp/issues/100)) ([f4a189a](https://github.com/oaslananka/infra-lens-mcp/commit/f4a189a3c06d5e2eca1ca916e9c2d88ac3eb813e))
* **mcp:** align runtime and published contracts ([#97](https://github.com/oaslananka/infra-lens-mcp/issues/97)) ([b160439](https://github.com/oaslananka/infra-lens-mcp/commit/b160439c30cbae085db971da7724036c9e5a4d76))

## [1.1.1](https://github.com/oaslananka/infra-lens-mcp/compare/infra-lens-mcp-v1.1.0...infra-lens-mcp-v1.1.1) (2026-07-20)


### Bug Fixes

* **deps:** raise Babel security floor ([#95](https://github.com/oaslananka/infra-lens-mcp/issues/95)) ([aaeecf4](https://github.com/oaslananka/infra-lens-mcp/commit/aaeecf41bcd57be323d4a8176d486150667e639a))
* **release:** run current verifier against immutable tags ([#91](https://github.com/oaslananka/infra-lens-mcp/issues/91)) ([6c3a817](https://github.com/oaslananka/infra-lens-mcp/commit/6c3a817a295fbc3ed82f7bb975163cf34afb084a))
* **release:** verify npm trusted-publisher provenance ([#89](https://github.com/oaslananka/infra-lens-mcp/issues/89)) ([b84d43f](https://github.com/oaslananka/infra-lens-mcp/commit/b84d43f94762a1aa6703a2445fdfca915a8b5708))
* **security:** harden dependency and local analysis tooling ([#93](https://github.com/oaslananka/infra-lens-mcp/issues/93)) ([615f9f6](https://github.com/oaslananka/infra-lens-mcp/commit/615f9f6e80ee3f12e505eb82a62b77578b98a494))
* **toolchain:** raise pnpm security floor ([#94](https://github.com/oaslananka/infra-lens-mcp/issues/94)) ([da06089](https://github.com/oaslananka/infra-lens-mcp/commit/da06089c706753e0273cbf036451cc86591186c4))

## [1.1.0](https://github.com/oaslananka/infra-lens-mcp/compare/infra-lens-mcp-v1.0.6...infra-lens-mcp-v1.1.0) (2026-07-20)


### Features

* add collector capability inspection ([e1d3dac](https://github.com/oaslananka/infra-lens-mcp/commit/e1d3dacb134a30aba2816c43c689cf221e236ec7))
* add SSH production policy controls ([fea2387](https://github.com/oaslananka/infra-lens-mcp/commit/fea2387e7cc7ada2e14f51f066f095fa2933f0e4))
* add structured MCP tool outputs ([0efbbe2](https://github.com/oaslananka/infra-lens-mcp/commit/0efbbe20c06962c3923e30461a4707913fdfce31))
* document OAuth gateway strategy ([1b98380](https://github.com/oaslananka/infra-lens-mcp/commit/1b9838049b2b6198d63f2bb4038fd1c979f85972))
* expand linux diagnostic signals ([3964f9f](https://github.com/oaslananka/infra-lens-mcp/commit/3964f9fb270ea64074ff9947cb517a55e61b88f3))
* harden HTTP request handling ([2f92d79](https://github.com/oaslananka/infra-lens-mcp/commit/2f92d799382a7390e342e3a57f0a43aaa1e927ec))
* improve anomaly analysis ([be6f9c5](https://github.com/oaslananka/infra-lens-mcp/commit/be6f9c5ed07561d6b29f6c917232af0111a1a932))


### Bug Fixes

* align HTTP endpoint guards with MCP spec ([fb2e723](https://github.com/oaslananka/infra-lens-mcp/commit/fb2e723e0f4a19665dc07e566aa1b9f403d36fcd))
* align package identity and publish readiness ([910f235](https://github.com/oaslananka/infra-lens-mcp/commit/910f235fcd8ffc7549e01bc5ff146da415db0432))
* **docs:** keep generated API docs stable across releases ([#87](https://github.com/oaslananka/infra-lens-mcp/issues/87)) ([55c59db](https://github.com/oaslananka/infra-lens-mcp/commit/55c59db264a5159c273cadf74d23926ad1ab269d))
* **packaging:** align npm metadata with repository ([fba380a](https://github.com/oaslananka/infra-lens-mcp/commit/fba380a0cc0618c788a3afbd5c34888a546f80d2))
* **packaging:** sync release metadata versions ([8049836](https://github.com/oaslananka/infra-lens-mcp/commit/804983660e7cc6a790312809528dd8a146fdc04d))
* **release:** generate SBOM from pnpm graph ([0889538](https://github.com/oaslananka/infra-lens-mcp/commit/08895387239b12a741afca24f639a135851b7688))
* **release:** reconcile canonical publication lineage ([#86](https://github.com/oaslananka/infra-lens-mcp/issues/86)) ([6952165](https://github.com/oaslananka/infra-lens-mcp/commit/6952165e08a690aee56cb95910755baa4a03c0d1))
* **release:** write SBOM to requested path ([5c2496d](https://github.com/oaslananka/infra-lens-mcp/commit/5c2496d7730bf5ac1a6406514d6e5d4e41f6a4d9))
* **security:** clear dependency and code scanning alerts ([7c73371](https://github.com/oaslananka/infra-lens-mcp/commit/7c733712f8e7f27f25d370d69b562e2c6b0b87b9))
* **storage:** isolate baselines from observations ([#84](https://github.com/oaslananka/infra-lens-mcp/issues/84)) ([1510a67](https://github.com/oaslananka/infra-lens-mcp/commit/1510a67bfd21908bd91243d5989c9894ac3ccee2))

## [1.0.6](https://github.com/oaslananka/infra-lens-mcp/compare/infra-lens-mcp-v1.0.5...infra-lens-mcp-v1.0.6) (2026-05-26)


### Bug Fixes

* **release:** write SBOM to requested path ([5c2496d](https://github.com/oaslananka/infra-lens-mcp/commit/5c2496d7730bf5ac1a6406514d6e5d4e41f6a4d9))

## [1.0.5](https://github.com/oaslananka/infra-lens-mcp/compare/infra-lens-mcp-v1.0.4...infra-lens-mcp-v1.0.5) (2026-05-26)


### Bug Fixes

* **release:** generate SBOM from pnpm graph ([0889538](https://github.com/oaslananka/infra-lens-mcp/commit/08895387239b12a741afca24f639a135851b7688))

## [1.0.4](https://github.com/oaslananka/infra-lens-mcp/compare/infra-lens-mcp-v1.0.3...infra-lens-mcp-v1.0.4) (2026-05-26)


### Bug Fixes

* **packaging:** sync release metadata versions ([8049836](https://github.com/oaslananka/infra-lens-mcp/commit/804983660e7cc6a790312809528dd8a146fdc04d))

## [1.0.3](https://github.com/oaslananka/infra-lens-mcp/compare/infra-lens-mcp-v1.0.2...infra-lens-mcp-v1.0.3) (2026-05-26)


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
