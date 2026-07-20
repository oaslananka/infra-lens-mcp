#!/usr/bin/env node
import assert from 'node:assert/strict';

import { evaluateReleaseState } from './release-state-core.mjs';

function base(overrides = {}) {
  const version = overrides.version ?? '1.1.0';
  return {
    packageName: 'infra-lens-mcp',
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
    npm: { exists: false, version: null, gitHead: null, integrity: null },
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
