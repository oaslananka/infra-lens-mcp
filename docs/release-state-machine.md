# Release State Machine

`scripts/release-state.mjs` inspects local version metadata and the public release lineage.

## Commands

```bash
pnpm run release:dry-run
node scripts/release-state.mjs --strict
node scripts/release-state.mjs --version 1.1.0 --require-complete
node scripts/release-state.mjs --version 1.1.0 --require-complete --wait-seconds 900
```

- The default command prints JSON and does not fail merely because the checked version is already published.
- `--strict` is a pre-release gate and exits non-zero unless a coherent open Release Please pull request is safe to merge.
- `--require-complete` is a post-release gate and exits non-zero unless every enabled publication target is present and coherent.
- `--wait-seconds` polls incomplete publication targets, allowing concurrently dispatched publishers to finish.

## States

### `legacy-manual`

A specifically recorded historical publication does not follow the canonical tag and GitHub Release lineage. Version `1.0.6` is the only current exception. It is coherent only when its recorded npm commit and MCP Registry entry remain unchanged, and it is never safe to republish.

### `no-release`

Local metadata is aligned, no target artifact exists, and no Release Please pull request is open.

### `release-pr-open`

Local metadata is aligned, no artifact for the candidate version exists, and Release Please has an open pull request. This is the only state where `safe_to_publish` is true; actual publication still occurs only after the release pull request creates a GitHub Release and the release orchestrator dispatches the publishers.

### `publishing`

The GitHub Release or another target artifact exists, but one or more required targets are not visible yet. The reconciliation workflow waits in this state.

### `blocked`

The version is partially published without a coherent canonical release, or artifact metadata conflicts with the expected version or commit.

### `complete`

All required metadata and artifacts agree:

- package, MCP, server, server package, and manifest versions;
- immutable Git tag and published stable GitHub Release;
- npm version and `gitHead` matching the tag commit;
- active MCP Registry version and npm package reference;
- GHCR version tag when GHCR publication is enabled.

A complete version is coherent but not safe to publish again.

## Output fields

The JSON output includes:

- `state` and `coherent`;
- `safe_to_publish`;
- `metadata_versions`;
- `artifacts` for Git, GitHub Releases, npm, MCP Registry, and GHCR;
- open `release_prs`;
- explicit `blockers`;
- `next_safe_command`.

Unknown API failures are reported as blockers rather than treated as missing artifacts.

### npm lineage evidence

Canonical npm releases use GitHub Trusted Publishing. Some trusted-publisher releases do not expose the historical `gitHead` registry field, so reconciliation accepts either of these equivalent lineage proofs:

- `gitHead` exactly matches the immutable release tag commit; or
- npm exposes GitHub Trusted Publishing plus SLSA provenance v1 whose repository, `main` ref, `publish-npm.yml` workflow, `repository_dispatch` event, resolved Git commit, package subject, and SHA-512 artifact digest all match the canonical release.

A missing or mismatched provenance field is a hard reconciliation failure. The release must never be republished to repair registry metadata.
