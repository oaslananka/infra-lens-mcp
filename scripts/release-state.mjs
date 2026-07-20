#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

import { evaluateReleaseState } from './release-state-core.mjs';
import { integritySha512Hex, parseNpmProvenance } from './npm-provenance.mjs';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function quoteCmdArg(value) {
  return /^[A-Za-z0-9@._:/\\=-]+$/.test(value) ? value : `"${String(value).replace(/"/g, '""')}"`;
}

function resolveCommand(command, args) {
  if (process.platform === 'win32' && command === 'npm') {
    return {
      command: process.env.ComSpec ?? 'cmd.exe',
      args: ['/d', '/s', '/c', ['npm', ...args].map(quoteCmdArg).join(' ')]
    };
  }
  return { command, args };
}

function run(command, args) {
  const resolved = resolveCommand(command, args);
  const result = spawnSync(resolved.command, resolved.args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  return {
    ok: result.status === 0 && !result.error,
    status: result.status,
    stdout: String(result.stdout ?? '').trim(),
    stderr: String(result.stderr ?? result.error?.message ?? '').trim()
  };
}

function normalizeRepositoryUrl(value) {
  return String(value ?? '')
    .replace(/^git\+/, '')
    .replace(/\.git$/, '')
    .replace(/\/$/, '');
}

function resolveGitHubRepository(value) {
  const normalized = normalizeRepositoryUrl(value);
  const sshMatch = normalized.match(/^git@github\.com:([^/]+)\/(.+)$/);
  if (sshMatch) return `${sshMatch[1]}/${sshMatch[2]}`;
  try {
    const url = new URL(normalized);
    const [owner, repo] = url.pathname.replace(/^\/|\/$/g, '').split('/');
    return url.hostname === 'github.com' && owner && repo ? `${owner}/${repo}` : null;
  } catch {
    return null;
  }
}

function parseArgs(argv) {
  const args = { strict: false, requireComplete: false, waitSeconds: 0, version: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--strict') args.strict = true;
    else if (value === '--require-complete') args.requireComplete = true;
    else if (value === '--wait-seconds') args.waitSeconds = Number(argv[++index] ?? 0);
    else if (value === '--version') args.version = argv[++index];
  }
  if (!Number.isFinite(args.waitSeconds) || args.waitSeconds < 0) {
    throw new Error('--wait-seconds must be a non-negative number.');
  }
  return args;
}

function releasePullRequests(repository) {
  const result = run('gh', [
    'pr',
    'list',
    '--repo',
    repository,
    '--state',
    'open',
    '--json',
    'number,title,url,headRefName,isDraft'
  ]);
  if (!result.ok) return { values: [], error: result.stderr || result.stdout };
  const values = JSON.parse(result.stdout || '[]').filter((pull) =>
    String(pull.headRefName ?? '').startsWith('release-please')
  );
  return { values, error: null };
}

function tagState(tagName) {
  const listed = run('git', ['tag', '--list', tagName]);
  const exists = listed.ok && listed.stdout.split('\n').includes(tagName);
  const commit = exists ? run('git', ['rev-list', '-n', '1', tagName]) : null;
  return {
    exists,
    name: tagName,
    commit: commit?.ok ? commit.stdout : null,
    error: commit && !commit.ok ? commit.stderr : null
  };
}

function githubReleaseState(repository, tagName) {
  const result = run('gh', [
    'release',
    'view',
    tagName,
    '--repo',
    repository,
    '--json',
    'tagName,url,isDraft,isPrerelease,publishedAt'
  ]);
  if (!result.ok) {
    const missing = /release not found|not found/i.test(`${result.stderr}\n${result.stdout}`);
    return { exists: false, tagName: null, error: missing ? null : result.stderr || result.stdout };
  }
  const release = JSON.parse(result.stdout);
  return { exists: true, ...release, error: null };
}

async function npmState(packageName, version) {
  const result = run('npm', [
    'view',
    `${packageName}@${version}`,
    'version',
    'gitHead',
    'dist.integrity',
    'dist.attestations.url',
    '_npmUser.trustedPublisher.id',
    '_npmUser.name',
    '--json'
  ]);
  if (!result.ok) {
    return {
      exists: false,
      version: null,
      gitHead: null,
      integrity: null,
      integritySha512: null,
      attestationUrl: null,
      trustedPublisher: { id: null, name: null },
      provenance: { exists: false },
      error: result.stderr || result.stdout || 'npm Registry request failed'
    };
  }

  const value = JSON.parse(result.stdout || '{}');
  const integrity = value['dist.integrity'] ?? value.dist?.integrity ?? null;
  const attestationUrl = value['dist.attestations.url'] ?? value.dist?.attestations?.url ?? null;
  const state = {
    exists: value.version === version,
    version: value.version ?? null,
    gitHead: value.gitHead ?? null,
    integrity,
    integritySha512: integritySha512Hex(integrity),
    attestationUrl,
    trustedPublisher: {
      id: value['_npmUser.trustedPublisher.id'] ?? value._npmUser?.trustedPublisher?.id ?? null,
      name: value['_npmUser.name'] ?? value._npmUser?.name ?? null
    },
    provenance: { exists: false },
    error: null
  };

  if (!state.exists || !attestationUrl) return state;

  const attestationResult = run('curl', [
    '--silent',
    '--show-error',
    '--location',
    '--retry',
    '3',
    '--retry-delay',
    '2',
    '--connect-timeout',
    '10',
    '--max-time',
    '30',
    '--write-out',
    '\n%{http_code}',
    attestationUrl
  ]);
  if (!attestationResult.ok) {
    return {
      ...state,
      error: attestationResult.stderr || 'npm attestation request failed'
    };
  }

  const separator = attestationResult.stdout.lastIndexOf('\n');
  const bodyText = separator >= 0 ? attestationResult.stdout.slice(0, separator) : '';
  const statusCode = Number(separator >= 0 ? attestationResult.stdout.slice(separator + 1) : 0);
  if (statusCode === 404) return state;
  if (statusCode < 200 || statusCode >= 300) {
    return { ...state, error: `npm attestation request returned HTTP ${statusCode}` };
  }

  try {
    return {
      ...state,
      provenance: parseNpmProvenance(JSON.parse(bodyText), packageName, version)
    };
  } catch (error) {
    return {
      ...state,
      error: `npm attestation parsing failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

async function mcpRegistryState(serverName, version) {
  const encodedName = encodeURIComponent(serverName);
  const url = `https://registry.modelcontextprotocol.io/v0.1/servers/${encodedName}/versions/${version}`;
  const result = run('curl', [
    '--silent',
    '--show-error',
    '--location',
    '--retry',
    '3',
    '--retry-delay',
    '2',
    '--connect-timeout',
    '10',
    '--max-time',
    '30',
    '--write-out',
    '\\n%{http_code}',
    url
  ]);
  if (!result.ok) {
    return {
      exists: false,
      version: null,
      packageVersion: null,
      status: null,
      error: result.stderr || 'MCP Registry request failed'
    };
  }
  const separator = result.stdout.lastIndexOf('\n');
  const bodyText = separator >= 0 ? result.stdout.slice(0, separator) : '';
  const statusCode = Number(separator >= 0 ? result.stdout.slice(separator + 1) : 0);
  if (statusCode === 404) {
    return { exists: false, version: null, packageVersion: null, status: null };
  }
  if (statusCode < 200 || statusCode >= 300) {
    return {
      exists: false,
      version: null,
      packageVersion: null,
      status: null,
      error: `HTTP ${statusCode}`
    };
  }
  try {
    const body = JSON.parse(bodyText);
    const npmPackage = body.server?.packages?.find((entry) => entry.registryType === 'npm');
    const official = body._meta?.['io.modelcontextprotocol.registry/official'];
    return {
      exists: true,
      name: body.server?.name ?? null,
      version: body.server?.version ?? null,
      packageIdentifier: npmPackage?.identifier ?? null,
      packageVersion: npmPackage?.version ?? null,
      status: official?.status ?? null,
      publishedAt: official?.publishedAt ?? null
    };
  } catch (error) {
    return {
      exists: false,
      version: null,
      packageVersion: null,
      status: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function queryGhcr(owner, repositoryName, version) {
  for (const scope of ['users', 'orgs']) {
    const result = run('gh', [
      'api',
      `/${scope}/${owner}/packages/container/${repositoryName}/versions?per_page=100`
    ]);
    if (!result.ok) {
      if (/404|not found/i.test(`${result.stderr}\n${result.stdout}`)) continue;
      return { exists: false, version, error: result.stderr || result.stdout };
    }
    const versions = JSON.parse(result.stdout || '[]');
    const match = versions.find((entry) => entry.metadata?.container?.tags?.includes(version));
    return {
      exists: Boolean(match),
      version,
      packageVersionId: match?.id ?? null,
      tags: match?.metadata?.container?.tags ?? []
    };
  }
  return { exists: false, version, packageVersionId: null, tags: [] };
}

async function collectState(versionOverride) {
  const packageJson = readJson('package.json');
  const mcpJson = readJson('mcp.json');
  const serverJson = readJson('server.json');
  const manifest = readJson('.release-please-manifest.json');
  const version = versionOverride ?? packageJson.version;
  if (version !== packageJson.version) {
    throw new Error(
      `Requested version ${version} does not match checked-out package version ${packageJson.version}.`
    );
  }
  const repository = resolveGitHubRepository(packageJson.repository?.url ?? packageJson.repository);
  if (!repository) throw new Error('package.json repository must resolve to a GitHub repository.');
  const [owner, repositoryName] = repository.split('/');
  const expectedTag = `${packageJson.name}-v${version}`;
  const tag = tagState(expectedTag);
  const githubRelease = githubReleaseState(repository, expectedTag);
  const npm = await npmState(packageJson.name, version);
  const mcpRegistry = await mcpRegistryState(serverJson.name, version);
  const ghcrRequired = existsSync('.github/workflows/publish-ghcr.yml');
  const ghcr = queryGhcr(owner, repositoryName, version);
  const releasePrs = releasePullRequests(repository);

  const artifacts = {
    tag,
    github_release: githubRelease,
    npm,
    mcp_registry: mcpRegistry,
    ghcr: { ...ghcr, required: ghcrRequired }
  };

  const evaluated = evaluateReleaseState({
    packageName: packageJson.name,
    repository,
    serverName: serverJson.name,
    version,
    metadata: {
      package: packageJson.version,
      mcp: mcpJson.version,
      server: serverJson.version,
      serverPackage: serverJson.packages?.[0]?.version,
      manifest: manifest['.']
    },
    tag,
    githubRelease,
    npm,
    mcpRegistry,
    ghcr,
    ghcrRequired,
    releasePrs: releasePrs.values,
    artifacts
  });

  const lookupErrors = [];
  if (releasePrs.error) lookupErrors.push(`release PR lookup failed: ${releasePrs.error}`);
  for (const [name, artifact] of Object.entries(artifacts)) {
    if (artifact.error) lookupErrors.push(`${name} lookup failed: ${artifact.error}`);
  }
  if (lookupErrors.length > 0) {
    evaluated.blockers.push(...lookupErrors);
    evaluated.coherent = false;
    evaluated.safe_to_publish = false;
  }
  return { ...evaluated, repository, checked_at: new Date().toISOString() };
}

const args = parseArgs(process.argv.slice(2));
const deadline = Date.now() + args.waitSeconds * 1000;
let result = await collectState(args.version);

while (!(result.state === 'complete' && result.coherent) && Date.now() < deadline) {
  await new Promise((resolve) => setTimeout(resolve, 15_000));
  result = await collectState(args.version);
}

console.log(JSON.stringify(result, null, 2));

if (args.requireComplete && !(result.state === 'complete' && result.coherent)) process.exit(1);
if (args.strict && !result.safe_to_publish) process.exit(1);
