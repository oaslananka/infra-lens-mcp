# Release

## Canonical release model

`infra-lens-mcp` uses Release Please manifest mode:

- `release-please-config.json`
- `.release-please-manifest.json`
- `.github/workflows/release.yml`

Version numbers come from Conventional Commits, SemVer, Release Please, and the manifest. Release tags use `infra-lens-mcp-vX.Y.Z`.

The canonical production sequence is:

1. A change is merged to `main`.
2. Release Please opens or updates the release pull request.
3. Required CI and security checks pass on the release pull request. Release Please authenticates with the repository `RELEASE_PLEASE_TOKEN` secret so its pull-request updates emit normal workflow events; using the default GitHub Actions token would leave protected checks absent.
4. The release pull request is merged.
5. Release Please creates the immutable Git tag and published GitHub Release.
6. `release.yml` sends one `infra-lens-release` repository-dispatch event containing the tag and version.
7. npm, GHCR, and MCP Registry workflows verify the published GitHub Release and check out its immutable tag before publishing.
8. `Reconcile Release` waits for every publication and proves that metadata, tag commit, npm `gitHead`, registry version, and GHCR version agree.

The dispatch step is explicit because events created with the repository `GITHUB_TOKEN` do not normally start additional workflow runs; `repository_dispatch` is an intentional exception supported by GitHub Actions. Implementation pull requests and ordinary pushes never publish production artifacts.

Package-bundled documentation changes are visible on GitHub as soon as they merge, but npm, MCP Registry, and GHCR remain bound to the last immutable release tag. When maintainers intentionally need those bundled documents synchronized across every publication channel, use a reviewed patch release and a `Release-As: X.Y.Z` commit footer. Never republish an existing version or move an existing tag.

## Legacy 1.0.6 publication

`infra-lens-mcp@1.0.6` was published manually on July 6, 2026 from commit `7aa3742daa224019cf9b0ab35bc2d0d9c809e12b`. The same version is active as `io.github.oaslananka/infra-lens-mcp@1.0.6` in the MCP Registry.

That publication does not have a matching `infra-lens-mcp-v1.0.6` Git tag or GitHub Release. Existing `mcp-infra-lens-v1.0.6` records belong to the previous package identity and are not the canonical tag for `infra-lens-mcp`.

This is a recorded legacy exception:

- do not recreate or move an `infra-lens-mcp-v1.0.6` tag;
- do not create a retrospective GitHub Release for that tag;
- do not republish or mutate npm or MCP Registry version `1.0.6`;
- use the next version selected by Release Please to establish the canonical lineage.

`pnpm run release:dry-run` reports this state as `legacy-manual` rather than suggesting that `1.0.6` can be repaired by republishing.

## Publication workflows

### Release orchestration

`.github/workflows/release.yml` is the only normal production orchestrator. Its Release Please job has narrowly scoped write permission for repository contents, pull requests, and issues. After Release Please creates a release, it sends the `infra-lens-release` repository-dispatch event with the immutable tag and version.

A privileged maintainer can send the same event through the GitHub API as an audited break-glass recovery action, but each publisher still refuses to run unless the matching stable GitHub Release exists and the checked-out commit equals the tag commit.

### npm

`.github/workflows/publish-npm.yml` publishes only on the canonical repository-dispatch event. It uses the protected `npm-production` environment and npm Trusted Publishing/OIDC. A UI/manual dispatch is validation-only: it can install, test, build, validate metadata, and pack a selected ref, but it cannot attest or publish.

### GHCR

`.github/workflows/publish-ghcr.yml` pushes images only on the canonical repository-dispatch event. UI/manual dispatches build the selected ref without logging in or pushing. Validation and publication both build `linux/amd64` and `linux/arm64` with QEMU and Buildx.

Release images include the SemVer version, release tag, and `latest`; OCI labels and index annotations; BuildKit `mode=max` provenance; and an attached SBOM. The workflow binds a GitHub artifact attestation to the pushed multi-architecture digest, signs that digest keylessly with Cosign through GitHub OIDC, and immediately verifies the certificate identity and issuer.

Use the immutable digest printed in the workflow summary when verifying a release:

```bash
IMAGE=ghcr.io/oaslananka/infra-lens-mcp
DIGEST=sha256:<digest-from-release-workflow>

docker buildx imagetools inspect "${IMAGE}@${DIGEST}"
cosign verify \
  --certificate-identity "https://github.com/oaslananka/infra-lens-mcp/.github/workflows/publish-ghcr.yml@refs/heads/main" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  "${IMAGE}@${DIGEST}"
gh attestation verify "oci://${IMAGE}@${DIGEST}" --repo oaslananka/infra-lens-mcp
```

`docker buildx imagetools inspect` must list both `linux/amd64` and `linux/arm64`. BuildKit stores the SBOM and provenance as OCI attestations associated with the same immutable digest; the GitHub attestation and Cosign signature provide independent identity evidence.

### MCP Registry

`.github/workflows/publish-mcp-registry.yml` validates metadata on pull requests and UI/manual dispatches. Production publication runs only on the canonical repository-dispatch event and only after the matching npm package becomes visible.

### Reconciliation

`.github/workflows/reconcile-release.yml` is read-only. On the canonical dispatch it polls for up to 15 minutes and requires all of the following to agree:

- `package.json`, `mcp.json`, `server.json`, and `.release-please-manifest.json` versions;
- immutable Git tag and published GitHub Release;
- tag commit and npm `gitHead`;
- npm package version;
- active MCP Registry server and package version;
- GHCR image version tag when the GHCR publication workflow is enabled.

It can also be manually dispatched for an existing version to audit release lineage. It never creates or modifies artifacts.

## Repository settings

The repository must keep these settings enabled:

- default workflow token permission: read-only;
- allow GitHub Actions to create pull requests, required by Release Please;
- protected `npm-production` and `mcp-registry` environments restricted to protected branches;
- the active `main-ci-solo-maintainer` ruleset and its required CI, security, dependency-review, Semgrep, SonarQube Cloud, Docker, Windows, and review-thread gates. See [Repository control baseline](./governance/repository-controls.md).

Enabling Actions pull-request creation does not grant broad write access by default. The repository default remains read-only, while `release.yml` requests only the explicit permissions needed by Release Please.

## Trusted Publishing and provenance

Configure npm Trusted Publishing for:

- owner/repository: `oaslananka/infra-lens-mcp`;
- workflow filename: `publish-npm.yml`;
- environment: `npm-production`;
- allowed operation: `npm publish`.

End-to-end environment and provenance evidence are tracked in [issue #62](https://github.com/oaslananka/infra-lens-mcp/issues/62).

## Failure handling

When publication fails halfway:

1. Do not create or move tags and do not republish an existing version.
2. Run `pnpm run release:dry-run` from the release tag.
3. Inspect the failed publisher and `Reconcile Release` result.
4. Rerun only the failed repository-dispatch path after confirming that its target registry does not already contain the version.
5. Use UI/manual dispatch only for validation.
6. Record the incident and verification evidence on the release issue or release pull request.
