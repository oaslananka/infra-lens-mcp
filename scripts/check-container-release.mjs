#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const workflow = readFileSync('.github/workflows/publish-ghcr.yml', 'utf8');
const ciWorkflow = readFileSync('.github/workflows/ci.yml', 'utf8');
const dockerfile = readFileSync('Dockerfile', 'utf8');
const readme = readFileSync('README.md', 'utf8');
const releaseDocs = readFileSync('docs/release.md', 'utf8');
const securityDocs = readFileSync('docs/security.md', 'utf8');

const fail = (message) => {
  throw new Error(`Container release policy check failed: ${message}`);
};

const requireFragment = (text, fragment, description) => {
  if (!text.includes(fragment)) fail(description);
};

requireFragment(
  workflow,
  'docker/setup-qemu-action@96fe6ef7f33517b61c61be40b68a1882f3264fb8',
  'QEMU must be pinned for multi-architecture builds'
);
requireFragment(
  workflow,
  'docker.io/tonistiigi/binfmt:qemu-v10.2.3@sha256:400a4873b838d1b89194d982c45e5fb3cda4593fbfd7e08a02e76b03b21166f0',
  'the QEMU binfmt image must be digest-pinned'
);
if ((workflow.match(/platforms: linux\/amd64,linux\/arm64/g) ?? []).length < 2) {
  fail('validation and publication must both build linux/amd64 and linux/arm64');
}
requireFragment(workflow, 'id: build', 'the pushed image digest must be captured');
requireFragment(workflow, 'provenance: mode=max', 'BuildKit max provenance must be enabled');
requireFragment(workflow, 'sbom: true', 'BuildKit SBOM generation must be enabled');
requireFragment(
  workflow,
  'labels: ${{ steps.meta.outputs.labels }}',
  'OCI metadata labels must be attached'
);
requireFragment(
  workflow,
  'actions/attest-build-provenance@0f67c3f4856b2e3261c31976d6725780e5e4c373',
  'GitHub provenance attestation must use the pinned v4 action'
);
requireFragment(
  workflow,
  'subject-digest: ${{ steps.build.outputs.digest }}',
  'attestation must bind the image digest'
);
requireFragment(workflow, 'push-to-registry: true', 'attestation must be attached to GHCR');
requireFragment(
  workflow,
  'sigstore/cosign-installer@6f9f17788090df1f26f669e9d70d6ae9567deba6',
  'Cosign installer must be pinned'
);
requireFragment(workflow, 'cosign-release: v3.0.6', 'Cosign version must be explicit');
requireFragment(workflow, 'cosign sign --yes', 'the immutable image digest must be signed');
requireFragment(workflow, 'cosign verify', 'the keyless signature must be verified immediately');
requireFragment(
  workflow,
  'https://token.actions.githubusercontent.com',
  'Cosign verification must pin the GitHub OIDC issuer'
);
requireFragment(workflow, 'attestations: write', 'publish job must request attestation permission');
requireFragment(workflow, 'id-token: write', 'publish job must request OIDC permission');
requireFragment(dockerfile, 'USER appuser', 'runtime image must stay non-root');
requireFragment(
  dockerfile,
  'INFRA_LENS_DB=/home/appuser/.infra-lens-mcp/metrics.db',
  'persistent state path must remain explicit'
);
for (const fragment of [
  'Hardened read-only runtime smoke',
  '--read-only',
  '--cap-drop=ALL',
  '--security-opt=no-new-privileges:true',
  '--tmpfs /tmp:rw,noexec,nosuid,nodev,size=64m',
  'dst=/home/appuser/.infra-lens-mcp'
]) {
  requireFragment(ciWorkflow, fragment, `Docker CI must enforce ${fragment}`);
}

const runtimeGuidance = `${readme}
${securityDocs}`;
for (const fragment of [
  '--read-only',
  '--cap-drop=ALL',
  'no-new-privileges',
  '--tmpfs',
  '/home/appuser/.infra-lens-mcp'
]) {
  requireFragment(
    runtimeGuidance,
    fragment,
    `runtime hardening documentation must include ${fragment}`
  );
}
for (const fragment of ['cosign verify', 'gh attestation verify', 'linux/amd64', 'linux/arm64']) {
  requireFragment(releaseDocs, fragment, `release documentation must include ${fragment}`);
}

console.log('Container release policy check passed.');
