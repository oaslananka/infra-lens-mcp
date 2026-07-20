#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const failures = [];

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), 'utf8'));
}

function normalizeUrl(value) {
  return String(value ?? '')
    .replace(/^git\+/, '')
    .replace(/\.git$/, '')
    .replace(/\/$/, '');
}

function fail(message) {
  failures.push(message);
}

const packageJson = readJson('package.json');
const mcpJson = readJson('mcp.json');
const serverJson = readJson('server.json');

const packageRepository = normalizeUrl(packageJson.repository?.url ?? packageJson.repository);
const mcpRepository = normalizeUrl(mcpJson.repository);
const serverRepository = normalizeUrl(serverJson.repository?.url);

if (packageJson.name !== 'infra-lens-mcp') {
  fail('package.json name must be infra-lens-mcp.');
}

if (packageJson.mcpName !== serverJson.name) {
  fail('package.json mcpName must match server.json name.');
}

if (packageJson.version !== mcpJson.version || packageJson.version !== serverJson.version) {
  fail('package.json, mcp.json, and server.json versions must match.');
}

const serverPackage = serverJson.packages?.[0];
if (serverPackage?.identifier !== packageJson.name) {
  fail('server.json package identifier must match package.json name.');
}

if (serverPackage?.version !== packageJson.version) {
  fail('server.json package version must match package.json version.');
}

if (packageRepository !== mcpRepository || packageRepository !== serverRepository) {
  fail('repository URLs must match across package.json, mcp.json, and server.json.');
}

if (mcpJson.node_version !== packageJson.engines?.node) {
  fail('mcp.json node_version must match package.json engines.node.');
}

const requiredFiles = [
  'dist',
  'README.md',
  'LICENSE',
  'CHANGELOG.md',
  'mcp.json',
  'server.json',
  'docs'
];
for (const file of requiredFiles) {
  if (!packageJson.files?.includes(file)) {
    fail(`package.json files must include ${file}.`);
  }
}

const transports = new Set(mcpJson.transport ?? []);
const serverTransport = serverPackage?.transport?.type;
if (serverTransport && !transports.has(serverTransport)) {
  fail('server.json package transport must be listed in mcp.json transport.');
}

if (transports.has('http') && mcpJson.connector_readiness?.publishReady === true) {
  fail(
    'HTTP connector publish readiness cannot be true without production OAuth/HTTPS validation.'
  );
}

const runtimeModulePath = join(root, 'dist/server-core.js');
if (!existsSync(runtimeModulePath)) {
  fail(
    'dist/server-core.js must exist so published metadata can be checked against runtime tools.'
  );
} else {
  const runtimeModule = await import(pathToFileURL(runtimeModulePath).href);
  const runtimeDefinitions = runtimeModule.createToolDefinitions();
  const runtimeToolNames = runtimeDefinitions.map((definition) => definition.name);
  const publishedToolNames = (mcpJson.tools ?? []).map((tool) => tool.name);

  if (JSON.stringify(runtimeToolNames) !== JSON.stringify(publishedToolNames)) {
    fail(
      `mcp.json tools must match runtime registrations in order: ${runtimeToolNames.join(', ')}.`
    );
  }

  const persistenceTools = new Set(['analyze_server', 'snapshot', 'record_baseline']);
  for (const definition of runtimeDefinitions) {
    if (persistenceTools.has(definition.name) && definition.config.annotations.readOnlyHint) {
      fail(`${definition.name} persists SQLite data and must not advertise readOnlyHint=true.`);
    }
  }
}

const contractFiles = [
  '.env.example',
  '.mcp.json',
  '.codex/config.example.toml',
  '.vscode/mcp.example.json',
  'opencode.example.jsonc',
  'README.md',
  'Dockerfile',
  'docs/integrations/client-setup.md'
];
for (const contractFile of contractFiles) {
  const content = readFileSync(join(root, contractFile), 'utf8');
  for (const forbiddenVariable of ['INFRA_LENS_TRANSPORT', 'MCP_TRANSPORT']) {
    if (content.includes(forbiddenVariable)) {
      fail(
        `${contractFile} must select transport by executable entry point, not ${forbiddenVariable}.`
      );
    }
  }
}

const environmentExample = readFileSync(join(root, '.env.example'), 'utf8');
for (const reservedVariable of ['OTEL_EXPORTER_OTLP_ENDPOINT', 'OTEL_SERVICE_NAME']) {
  if (environmentExample.includes(reservedVariable)) {
    fail(`${reservedVariable} must not be advertised before OpenTelemetry export is implemented.`);
  }
}

if (process.env.CHECK_METADATA_REQUIRE_DIST === 'true') {
  for (const file of [
    'dist/index.js',
    'dist/index.d.ts',
    'dist/mcp.js',
    'dist/server-http.js',
    'dist/mcp.d.ts',
    'dist/server-http.d.ts'
  ]) {
    if (!existsSync(join(root, file))) {
      fail(`${file} must exist before packaging.`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

const connectorPublishReady = mcpJson.connector_readiness?.publishReady ?? false;
const connectorPublishBlocker = connectorPublishReady
  ? null
  : (mcpJson.connector_readiness?.reason ??
    'Connector publication is intentionally blocked until its external production requirements are met.');

console.log(
  JSON.stringify(
    {
      ok: true,
      package: packageJson.name,
      version: packageJson.version,
      mcpName: packageJson.mcpName,
      transports: [...transports],
      packageReady: true,
      connectorPublishReady,
      publishReady: connectorPublishReady,
      publishBlocker: connectorPublishBlocker
    },
    null,
    2
  )
);
