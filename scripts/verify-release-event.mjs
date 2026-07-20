#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0 || result.error) {
    throw new Error(
      String(result.stderr || result.stdout || result.error?.message || `${command} failed`).trim()
    );
  }
  return String(result.stdout).trim();
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const expectedTag = `${pkg.name}-v${pkg.version}`;
const releaseTag = process.env.RELEASE_TAG;
const releaseVersion = process.env.RELEASE_VERSION;
const repository = process.env.GITHUB_REPOSITORY;

if (process.env.GITHUB_EVENT_NAME !== 'repository_dispatch') {
  throw new Error('Production publishing requires the canonical repository_dispatch event.');
}
if (!releaseTag || releaseTag !== expectedTag) {
  throw new Error(
    `Release tag ${releaseTag ?? 'missing'} does not match package tag ${expectedTag}.`
  );
}
if (releaseVersion && releaseVersion !== pkg.version) {
  throw new Error(
    `Release version ${releaseVersion} does not match package version ${pkg.version}.`
  );
}
if (!repository) {
  throw new Error('GITHUB_REPOSITORY is required.');
}

const release = JSON.parse(
  run('gh', [
    'release',
    'view',
    expectedTag,
    '--repo',
    repository,
    '--json',
    'tagName,url,isDraft,isPrerelease,publishedAt,targetCommitish'
  ])
);
if (release.tagName !== expectedTag) {
  throw new Error(`GitHub Release tag ${release.tagName} does not match ${expectedTag}.`);
}
if (release.isDraft || release.isPrerelease || !release.publishedAt) {
  throw new Error('Production publishing requires a published, stable GitHub Release.');
}

const head = run('git', ['rev-parse', 'HEAD']);
const tagCommit = run('git', ['rev-list', '-n', '1', expectedTag]);
if (head !== tagCommit) {
  throw new Error(`Checked-out commit ${head} does not match ${expectedTag} commit ${tagCommit}.`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      package: pkg.name,
      version: pkg.version,
      tag: expectedTag,
      commit: head,
      release_url: release.url,
      published_at: release.publishedAt
    },
    null,
    2
  )
);
