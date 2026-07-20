export const LEGACY_PUBLICATIONS = Object.freeze({
  '1.0.6': Object.freeze({
    npmGitHead: '7aa3742daa224019cf9b0ab35bc2d0d9c809e12b',
    note: 'Published manually to npm and the MCP Registry without a matching infra-lens-mcp Git tag or GitHub Release.'
  })
});

function unique(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null))];
}

export function evaluateReleaseState(input) {
  const version = input.version;
  const expectedTag = `${input.packageName}-v${version}`;
  const metadataVersions = {
    package: input.metadata.package,
    mcp: input.metadata.mcp,
    server: input.metadata.server,
    serverPackage: input.metadata.serverPackage,
    manifest: input.metadata.manifest
  };
  const distinctVersions = unique(Object.values(metadataVersions));
  const metadataAligned = distinctVersions.length === 1 && distinctVersions[0] === version;
  const errors = [];

  if (!metadataAligned) {
    errors.push(`version metadata drift: ${JSON.stringify(metadataVersions)}`);
  }
  if (input.tag.exists && input.tag.name !== expectedTag) {
    errors.push(`unexpected Git tag ${input.tag.name}; expected ${expectedTag}`);
  }
  if (input.githubRelease.exists && input.githubRelease.tagName !== expectedTag) {
    errors.push(
      `unexpected GitHub Release tag ${input.githubRelease.tagName}; expected ${expectedTag}`
    );
  }
  if (
    input.githubRelease.exists &&
    (input.githubRelease.isDraft ||
      input.githubRelease.isPrerelease ||
      !input.githubRelease.publishedAt)
  ) {
    errors.push(`GitHub Release ${expectedTag} is not a published stable release`);
  }
  if (input.npm.exists && input.npm.version !== version) {
    errors.push(`npm reports ${input.npm.version}; expected ${version}`);
  }
  if (input.npm.exists && !input.npm.integrity) {
    errors.push(`npm package ${input.packageName}@${version} does not expose dist integrity`);
  }
  if (input.mcpRegistry.exists && input.mcpRegistry.name !== input.serverName) {
    errors.push(`MCP Registry reports ${input.mcpRegistry.name}; expected ${input.serverName}`);
  }
  if (input.mcpRegistry.exists && input.mcpRegistry.packageIdentifier !== input.packageName) {
    errors.push(
      `MCP Registry package identifier ${input.mcpRegistry.packageIdentifier}; expected ${input.packageName}`
    );
  }
  if (input.mcpRegistry.exists && input.mcpRegistry.version !== version) {
    errors.push(`MCP Registry reports ${input.mcpRegistry.version}; expected ${version}`);
  }
  if (input.mcpRegistry.exists && input.mcpRegistry.packageVersion !== version) {
    errors.push(
      `MCP Registry package version ${input.mcpRegistry.packageVersion}; expected ${version}`
    );
  }
  if (input.mcpRegistry.exists && input.mcpRegistry.status !== 'active') {
    errors.push(`MCP Registry status is ${input.mcpRegistry.status}; expected active`);
  }
  if (input.tag.exists && input.npm.exists && input.tag.commit && input.npm.gitHead) {
    if (input.tag.commit !== input.npm.gitHead) {
      errors.push(`npm gitHead ${input.npm.gitHead} does not match tag commit ${input.tag.commit}`);
    }
  }

  const legacy = LEGACY_PUBLICATIONS[version];
  if (!legacy && input.npm.exists && !input.npm.gitHead) {
    const provenance = input.npm.provenance ?? { exists: false };
    const expectedRepository = `https://github.com/${input.repository}`;
    const expectedSubject = `pkg:npm/${input.packageName}@${version}`;

    if (input.npm.trustedPublisher?.id !== 'github') {
      errors.push(
        `npm package ${input.packageName}@${version} is not attributed to GitHub Trusted Publishing`
      );
    }
    if (!provenance.exists) {
      errors.push(
        `npm package ${input.packageName}@${version} exposes neither gitHead nor SLSA provenance`
      );
    } else {
      if (provenance.predicateType !== 'https://slsa.dev/provenance/v1') {
        errors.push(
          `npm provenance predicate is ${provenance.predicateType}; expected SLSA provenance v1`
        );
      }
      if (provenance.repository !== expectedRepository) {
        errors.push(
          `npm provenance repository ${provenance.repository}; expected ${expectedRepository}`
        );
      }
      if (input.tag.commit && provenance.commit !== input.tag.commit) {
        errors.push(
          `npm provenance commit ${provenance.commit} does not match tag commit ${input.tag.commit}`
        );
      }
      if (provenance.workflowPath !== '.github/workflows/publish-npm.yml') {
        errors.push(
          `npm provenance workflow ${provenance.workflowPath}; expected .github/workflows/publish-npm.yml`
        );
      }
      if (provenance.ref !== 'refs/heads/main') {
        errors.push(`npm provenance ref ${provenance.ref}; expected refs/heads/main`);
      }
      if (provenance.eventName !== 'repository_dispatch') {
        errors.push(`npm provenance event ${provenance.eventName}; expected repository_dispatch`);
      }
      if (provenance.subjectName !== expectedSubject) {
        errors.push(
          `npm provenance subject ${provenance.subjectName}; expected ${expectedSubject}`
        );
      }
      if (!input.npm.integritySha512 || provenance.subjectSha512 !== input.npm.integritySha512) {
        errors.push('npm provenance subject digest does not match dist integrity');
      }
    }
  }
  if (legacy) {
    if (!input.npm.exists) {
      errors.push(`legacy npm artifact ${input.packageName}@${version} is missing`);
    }
    if (input.npm.gitHead && input.npm.gitHead !== legacy.npmGitHead) {
      errors.push(
        `legacy npm gitHead ${input.npm.gitHead} does not match recorded ${legacy.npmGitHead}`
      );
    }
    if (!input.mcpRegistry.exists) {
      errors.push(`legacy MCP Registry version ${version} is missing`);
    }
    if (input.tag.exists || input.githubRelease.exists) {
      errors.push(`legacy version ${version} must not be recreated as ${expectedTag}`);
    }

    return {
      package: input.packageName,
      version,
      expected_tag: expectedTag,
      state: 'legacy-manual',
      coherent: errors.length === 0,
      safe_to_publish: false,
      metadata_versions: metadataVersions,
      artifacts: input.artifacts,
      release_prs: input.releasePrs,
      blockers: [legacy.note, 'Do not tag, recreate, or republish this version.', ...errors],
      next_safe_command:
        'Merge the Release Please PR for the next version after required checks are green.'
    };
  }

  const requiredArtifacts = [
    input.tag.exists,
    input.githubRelease.exists,
    input.npm.exists,
    input.mcpRegistry.exists,
    !input.ghcrRequired || input.ghcr.exists
  ];
  const complete = requiredArtifacts.every(Boolean);
  const anyPublishedArtifact = [
    input.tag.exists,
    input.githubRelease.exists,
    input.npm.exists,
    input.mcpRegistry.exists,
    input.ghcr.exists
  ].some(Boolean);
  const openReleasePr = input.releasePrs.length > 0;
  let state;
  const blockers = [...errors];

  if (complete) {
    state = 'complete';
  } else if (anyPublishedArtifact) {
    state = input.githubRelease.exists ? 'publishing' : 'blocked';
    if (!input.tag.exists) blockers.push(`missing Git tag ${expectedTag}`);
    if (!input.githubRelease.exists) blockers.push(`missing GitHub Release ${expectedTag}`);
    if (!input.npm.exists) blockers.push(`missing npm package ${input.packageName}@${version}`);
    if (!input.mcpRegistry.exists) blockers.push(`missing MCP Registry version ${version}`);
    if (input.ghcrRequired && !input.ghcr.exists) {
      blockers.push(`missing GHCR image tag ${version}`);
    }
  } else if (openReleasePr) {
    state = 'release-pr-open';
  } else {
    state = 'no-release';
    blockers.push('no open Release Please pull request was found');
  }

  const coherent = errors.length === 0 && (state === 'complete' || state === 'release-pr-open');
  const safeToPublish = state === 'release-pr-open' && errors.length === 0;

  return {
    package: input.packageName,
    version,
    expected_tag: expectedTag,
    state,
    coherent,
    safe_to_publish: safeToPublish,
    metadata_versions: metadataVersions,
    artifacts: input.artifacts,
    release_prs: input.releasePrs,
    blockers,
    next_safe_command:
      state === 'complete'
        ? 'Release lineage is complete; do not republish this version.'
        : safeToPublish
          ? 'Merge the Release Please PR after required checks and protected-environment approval.'
          : 'Do not publish until the reported release-state blockers are resolved.'
  };
}
