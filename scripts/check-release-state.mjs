#!/usr/bin/env node
import assert from 'node:assert/strict';

import { evaluateReleaseState } from './release-state-core.mjs';
import { integritySha512Hex, parseNpmProvenance } from './npm-provenance.mjs';

function base(overrides = {}) {
  const version = overrides.version ?? '1.1.0';
  return {
    packageName: 'infra-lens-mcp',
    repository: 'oaslananka/infra-lens-mcp',
    serverName: 'io.github.oaslananka/infra-lens-mcp',
    version,
    metadata: {
      package: version,
      mcp: version,
      server: version,
      serverPackage: version,
      manifest: version
    },
    tag: { exists: false, name: `infra-lens-mcp-v${version}`, commit: null },
    githubRelease: { exists: false, tagName: null },
    npm: {
      exists: false,
      version: null,
      gitHead: null,
      integrity: null,
      integritySha512: null,
      trustedPublisher: { id: null, name: null },
      provenance: { exists: false }
    },
    mcpRegistry: {
      exists: false,
      name: null,
      version: null,
      packageIdentifier: null,
      packageVersion: null,
      status: null
    },
    ghcr: { exists: false, version },
    ghcrRequired: true,
    releasePrs: [],
    artifacts: {},
    ...overrides
  };
}

const releasePr = evaluateReleaseState(
  base({ releasePrs: [{ number: 85, title: 'chore(main): release infra-lens-mcp 1.1.0' }] })
);
assert.equal(releasePr.state, 'release-pr-open');
assert.equal(releasePr.coherent, true);
assert.equal(releasePr.safe_to_publish, true);

const commit = '0123456789abcdef0123456789abcdef01234567';
const complete = evaluateReleaseState(
  base({
    tag: { exists: true, name: 'infra-lens-mcp-v1.1.0', commit },
    githubRelease: {
      exists: true,
      tagName: 'infra-lens-mcp-v1.1.0',
      isDraft: false,
      isPrerelease: false,
      publishedAt: '2026-07-20T00:00:00Z'
    },
    npm: {
      exists: true,
      version: '1.1.0',
      gitHead: commit,
      integrity: 'sha512-test'
    },
    mcpRegistry: {
      exists: true,
      name: 'io.github.oaslananka/infra-lens-mcp',
      version: '1.1.0',
      packageIdentifier: 'infra-lens-mcp',
      packageVersion: '1.1.0',
      status: 'active'
    },
    ghcr: { exists: true, version: '1.1.0' }
  })
);
assert.equal(complete.state, 'complete');
assert.equal(complete.coherent, true);
assert.equal(complete.safe_to_publish, false);

const integrity = `sha512-${Buffer.from('trusted-publisher-artifact').toString('base64')}`;
const integrityHex = integritySha512Hex(integrity);
const provenanceStatement = {
  _type: 'https://in-toto.io/Statement/v1',
  subject: [
    {
      name: 'pkg:npm/infra-lens-mcp@1.1.0',
      digest: { sha512: integrityHex }
    }
  ],
  predicateType: 'https://slsa.dev/provenance/v1',
  predicate: {
    buildDefinition: {
      externalParameters: {
        workflow: {
          ref: 'refs/heads/main',
          repository: 'https://github.com/oaslananka/infra-lens-mcp',
          path: '.github/workflows/publish-npm.yml'
        }
      },
      internalParameters: { github: { event_name: 'repository_dispatch' } },
      resolvedDependencies: [
        {
          uri: 'git+https://github.com/oaslananka/infra-lens-mcp@refs/heads/main',
          digest: { gitCommit: commit }
        }
      ]
    },
    runDetails: { metadata: { invocationId: 'https://github.com/example/actions/runs/1' } }
  }
};
const provenance = parseNpmProvenance(
  {
    attestations: [
      {
        predicateType: 'https://slsa.dev/provenance/v1',
        bundle: {
          dsseEnvelope: {
            payload: Buffer.from(JSON.stringify(provenanceStatement)).toString('base64')
          }
        }
      }
    ]
  },
  'infra-lens-mcp',
  '1.1.0'
);

const trustedPublisherComplete = evaluateReleaseState(
  base({
    tag: { exists: true, name: 'infra-lens-mcp-v1.1.0', commit },
    githubRelease: {
      exists: true,
      tagName: 'infra-lens-mcp-v1.1.0',
      isDraft: false,
      isPrerelease: false,
      publishedAt: '2026-07-20T00:00:00Z'
    },
    npm: {
      exists: true,
      version: '1.1.0',
      gitHead: null,
      integrity,
      integritySha512: integrityHex,
      trustedPublisher: { id: 'github', name: 'GitHub Actions' },
      provenance
    },
    mcpRegistry: {
      exists: true,
      name: 'io.github.oaslananka/infra-lens-mcp',
      version: '1.1.0',
      packageIdentifier: 'infra-lens-mcp',
      packageVersion: '1.1.0',
      status: 'active'
    },
    ghcr: { exists: true, version: '1.1.0' }
  })
);
assert.equal(trustedPublisherComplete.state, 'complete');
assert.equal(trustedPublisherComplete.coherent, true);

const mismatchedProvenance = evaluateReleaseState(
  base({
    tag: { exists: true, name: 'infra-lens-mcp-v1.1.0', commit },
    githubRelease: {
      exists: true,
      tagName: 'infra-lens-mcp-v1.1.0',
      isDraft: false,
      isPrerelease: false,
      publishedAt: '2026-07-20T00:00:00Z'
    },
    npm: {
      exists: true,
      version: '1.1.0',
      gitHead: null,
      integrity,
      integritySha512: integrityHex,
      trustedPublisher: { id: 'github', name: 'GitHub Actions' },
      provenance: { ...provenance, commit: 'ffffffffffffffffffffffffffffffffffffffff' }
    },
    mcpRegistry: {
      exists: true,
      name: 'io.github.oaslananka/infra-lens-mcp',
      version: '1.1.0',
      packageIdentifier: 'infra-lens-mcp',
      packageVersion: '1.1.0',
      status: 'active'
    },
    ghcr: { exists: true, version: '1.1.0' }
  })
);
assert.equal(mismatchedProvenance.coherent, false);
assert.match(mismatchedProvenance.blockers.join('\n'), /provenance commit/);

const missingLineage = evaluateReleaseState(
  base({
    tag: { exists: true, name: 'infra-lens-mcp-v1.1.0', commit },
    npm: {
      exists: true,
      version: '1.1.0',
      gitHead: null,
      integrity,
      integritySha512: integrityHex,
      trustedPublisher: { id: null, name: null },
      provenance: { exists: false }
    }
  })
);
assert.equal(missingLineage.coherent, false);
assert.match(missingLineage.blockers.join('\n'), /neither gitHead nor SLSA provenance/);

const partial = evaluateReleaseState(
  base({
    tag: { exists: true, name: 'infra-lens-mcp-v1.1.0', commit },
    githubRelease: {
      exists: true,
      tagName: 'infra-lens-mcp-v1.1.0',
      isDraft: false,
      isPrerelease: false,
      publishedAt: '2026-07-20T00:00:00Z'
    }
  })
);
assert.equal(partial.state, 'publishing');
assert.equal(partial.coherent, false);
assert.match(partial.blockers.join('\n'), /missing npm package/);

const draftRelease = evaluateReleaseState(
  base({
    tag: { exists: true, name: 'infra-lens-mcp-v1.1.0', commit },
    githubRelease: {
      exists: true,
      tagName: 'infra-lens-mcp-v1.1.0',
      isDraft: true,
      isPrerelease: false,
      publishedAt: null
    }
  })
);
assert.equal(draftRelease.coherent, false);
assert.match(draftRelease.blockers.join('\n'), /not a published stable release/);

const legacy = evaluateReleaseState(
  base({
    version: '1.0.6',
    metadata: {
      package: '1.0.6',
      mcp: '1.0.6',
      server: '1.0.6',
      serverPackage: '1.0.6',
      manifest: '1.0.6'
    },
    tag: { exists: false, name: 'infra-lens-mcp-v1.0.6', commit: null },
    npm: {
      exists: true,
      version: '1.0.6',
      gitHead: '7aa3742daa224019cf9b0ab35bc2d0d9c809e12b',
      integrity: 'sha512-legacy'
    },
    mcpRegistry: {
      exists: true,
      name: 'io.github.oaslananka/infra-lens-mcp',
      version: '1.0.6',
      packageIdentifier: 'infra-lens-mcp',
      packageVersion: '1.0.6',
      status: 'active'
    }
  })
);
assert.equal(legacy.state, 'legacy-manual');
assert.equal(legacy.coherent, true);
assert.equal(legacy.safe_to_publish, false);

console.log('Release state evaluator tests passed.');
