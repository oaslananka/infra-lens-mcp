# Release

## Model

`mcp-infra-lens` uses release-please manifest mode:

- `release-please-config.json`
- `.release-please-manifest.json`
- `.github/workflows/release.yml`

Version numbers come from Conventional Commits, SemVer, release-please, and the manifest. Do not create manual tags, manual GitHub Releases, or manual changelog release entries.
Release tags use the release-please component format `mcp-infra-lens-vX.Y.Z`.

## Publishing

Implementation PRs must not publish:

- npm packages
- containers
- MCP Registry metadata
- marketplace artifacts
- production GitHub Releases

Production npm publishing is allowed only from `.github/workflows/release.yml` after release-please reports `release_created == true`. The publish job runs in the `npm-production` environment and uses npm Trusted Publishing/OIDC. `NPM_TOKEN` is a fallback only if Trusted Publishing cannot be configured and must be loaded only inside the protected publish job.
The package `repository.url` must exactly match this GitHub repository for npm Trusted Publishing validation.

## Release workflow

1. Push to `main`.
2. release-please opens or updates a release PR.
3. Merge the release PR after required checks are green.
4. release-please creates the tag and GitHub Release.
5. The publish job checks that the version is not already on npm.
6. The job installs with pnpm, runs format, lint, tests, build, metadata validation, and package dry-run.
7. The job creates the npm tarball, SBOM, SHA256 checksums, and artifact attestation.
8. The job uploads release assets to the GitHub Release.
9. The job publishes the tarball to npm.
10. The job installs the published package in a temporary directory and imports it.

## Manual setup

Configure npm Trusted Publishing for package `mcp-infra-lens` with:

- owner/repo: `oaslananka/infra-lens-mcp`
- workflow filename: `release.yml`
- environment: `npm-production`
- allowed action: `npm publish`

Configure the GitHub `npm-production` environment with required reviewers before production publishing.

## Failure handling

If a release fails halfway:

- run `pnpm run release:dry-run` and inspect the state
- check whether the npm version exists
- check whether the tag or GitHub Release exists
- do not mutate published artifacts
- do not rerun publishing until duplicate version, tag, release, and asset state is understood
