# README Showcase and Documentation Refresh Design

## Goal

Present `infra-lens-mcp` as a mature public project at first glance, while correcting documentation that no longer matches the 1.5.0 runtime and completed governance work.

## README showcase

The README begins with a centered HTML hero inspired by the supplied KiCad Studio Kit example:

1. Project title and a concise operations-focused tagline.
2. One sentence describing the product boundary: Linux incident analysis over SSH with local history and review-first workflows.
3. A status row for CI, CodeQL, Security Gates, OSV-Scanner, Codecov, and OpenSSF Scorecard.
4. A distribution/runtime row for npm version, npm downloads, Node compatibility, MCP specification level, signed GHCR images, and MIT license.
5. A compact quick-link row for documentation, usage, architecture, security, governance, roadmap, support, and releases.
6. The existing Buy Me a Coffee button below the navigation links.

The hero must use only truthful badges backed by active workflows or public package metadata. It must remain readable when GitHub blocks an external badge image, and it must not claim public connector readiness.

After the hero, the README keeps a short product introduction, demo, tool table, quick start, configuration, security, HTTP, Docker, observability, development, community, release, license, and agent-runtime sections. The tool table remains the authoritative concise inventory of the ten current MCP tools.

## Documentation index

Create `docs/README.md` as the canonical documentation map. It groups existing documents into:

- getting started and client setup;
- operations, incident workflows, observability, and storage;
- architecture, ADRs, compatibility, and MCP compliance;
- security, governance, roadmap, and repository controls;
- testing, release, and automation.

The README hero links to this index instead of forcing readers to discover documentation from a long paragraph near the bottom.

## Documentation corrections

Update the MCP compliance matrix so closed issues are not presented as open follow-ups:

- keep Streamable HTTP `Partial` because stateful GET/SSE and DELETE session lifecycle are intentionally unsupported;
- mark origin validation and localhost-first binding as complete;
- describe bearer auth as supported for local/development use and production auth as delegated to an OAuth-aware gateway;
- mark the threat model and connector documentation as supported with executable evidence;
- replace the obsolete `#48` publication blocker reference with the actual external gateway and accepted-blocker conditions.

Rewrite `ROADMAP.md` around current product stages rather than already-passed 1.2.0 and 1.3.0 version labels. Completed capabilities are summarized as shipped; future work remains explicitly non-committed and does not promise autonomous remediation.

## Validation

The change must pass:

- `pnpm run docs:links:check`;
- `pnpm run docs:api:check`;
- `pnpm run check:metadata`;
- `pnpm run check:threat-model`;
- `pnpm run lint`;
- `pnpm run check:package-size` after a build;
- actionlint and zizmor workflow checks, because workflow badge links depend on stable workflow paths.

A final grep must confirm that public current-state documentation no longer treats issues #48, #52, #53, #63, or #67 as unresolved blockers.
