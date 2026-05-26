# ADR 0004: Release Automation

- Status: Accepted
- Date: 2026-05-26
- Owners: maintainers

## Context

The package publishes npm artifacts, GitHub Releases, SBOMs, checksums, and provenance attestations. Manual release steps risk version drift between `package.json`, MCP metadata, changelog entries, GitHub tags, npm package state, and release assets.

## Decision

Use release-please manifest mode for SemVer, changelog, tag, and GitHub Release creation. Publish npm packages only from `.github/workflows/release.yml` after release-please reports `release_created == true`. Use the protected `npm-production` environment, GitHub OIDC, npm Trusted Publishing, provenance attestation, generated SBOMs, and SHA256 checksums.

Keep `NPM_TOKEN` as a fallback only when Trusted Publishing cannot be configured. The fallback must be scoped to the protected publish job and must not be available to implementation PRs.

## Consequences

- Positive: Version changes, changelog entries, tags, and release assets follow one repeatable path.
- Positive: Package provenance and SBOM artifacts are produced with the release.
- Positive: Implementation PRs cannot publish production artifacts.
- Negative: npm package ownership and Trusted Publishing setup are external prerequisites.
- Follow-up: If a release partially succeeds, do not retag or republish the same version; cut a new patch after fixing the blocker.

## Alternatives Considered

| Option | Pros | Cons | Fit |
| --- | --- | --- | --- |
| release-please plus Trusted Publishing | Repeatable SemVer flow, no long-lived npm token, provenance-friendly | Requires environment and npm package setup | High |
| Manual npm publish | Simple for one-off releases | High risk of version drift and missing provenance/SBOM assets | Low |
| Token-only automated publish | Works before Trusted Publishing is configured | Requires storing and rotating a high-value registry secret | Medium |
