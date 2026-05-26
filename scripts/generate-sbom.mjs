#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const OUTPUT_PATH = process.argv.slice(2).filter((argument) => argument !== '--')[0];
const TOOL_NAME = 'infra-lens-sbom-generator';
const CYCLONEDX_SCHEMA = 'http://cyclonedx.org/schema/bom-1.6.schema.json';

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function packageRef(name, version) {
  const encodedName = name.split('/').map(encodeURIComponent).join('/');
  return `pkg:npm/${encodedName}@${encodeURIComponent(version)}`;
}

function quoteCmdArg(value) {
  return /^[A-Za-z0-9@._:/\\=-]+$/.test(value) ? value : `"${value.replace(/"/g, '""')}"`;
}

function createComponent(name, dependency) {
  const component = {
    type: 'library',
    'bom-ref': packageRef(name, dependency.version),
    name,
    version: dependency.version,
    purl: packageRef(name, dependency.version)
  };

  if (dependency.resolved) {
    component.externalReferences = [{ type: 'distribution', url: dependency.resolved }];
  }

  return component;
}

function collectDependencyGraph(dependencies, components, graph) {
  return Object.entries(dependencies ?? {})
    .filter(([, dependency]) => dependency?.version)
    .map(([name, dependency]) => {
      const ref = packageRef(name, dependency.version);
      if (!components.has(ref)) {
        components.set(ref, createComponent(name, dependency));
        graph.set(ref, collectDependencyGraph(dependency.dependencies, components, graph));
      }
      return ref;
    });
}

function createRootComponent(packageJson) {
  return {
    type: 'application',
    'bom-ref': packageRef(packageJson.name, packageJson.version),
    name: packageJson.name,
    version: packageJson.version,
    purl: packageRef(packageJson.name, packageJson.version),
    licenses: [{ license: { id: packageJson.license } }]
  };
}

function resolvePnpmCommand(args) {
  if (process.env.npm_execpath?.includes('pnpm')) {
    return { command: process.execPath, args: [process.env.npm_execpath, ...args] };
  }

  if (process.platform === 'win32') {
    return {
      command: process.env.ComSpec ?? 'cmd.exe',
      args: ['/d', '/s', '/c', ['pnpm', ...args].map(quoteCmdArg).join(' ')]
    };
  }

  return { command: 'pnpm', args };
}

function readProductionTree(packageJson) {
  const pnpm = resolvePnpmCommand(['list', '--prod', '--json', '--depth', 'Infinity']);
  const stdout = execFileSync(pnpm.command, pnpm.args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const trees = JSON.parse(stdout);
  return trees.find((tree) => tree.name === packageJson.name) ?? trees[0];
}

function createBom(packageJson, rootTree) {
  const components = new Map();
  const graph = new Map();
  const rootComponent = createRootComponent(packageJson);
  const rootDependencies = collectDependencyGraph(rootTree.dependencies, components, graph);

  return {
    $schema: CYCLONEDX_SCHEMA,
    bomFormat: 'CycloneDX',
    specVersion: '1.6',
    serialNumber: `urn:uuid:${randomUUID()}`,
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: {
        components: [{ type: 'application', name: TOOL_NAME, version: packageJson.version }]
      },
      component: rootComponent
    },
    components: [...components.values()].sort((left, right) => left.purl.localeCompare(right.purl)),
    dependencies: [
      { ref: rootComponent['bom-ref'], dependsOn: rootDependencies },
      ...[...graph.entries()].map(([ref, dependsOn]) => ({ ref, dependsOn }))
    ]
  };
}

if (!OUTPUT_PATH) {
  fail('Usage: node scripts/generate-sbom.mjs <output-file>');
}

const packageJson = readJson('package.json');
const rootTree = readProductionTree(packageJson);
if (!rootTree) {
  fail('Unable to read production dependency graph from pnpm.');
}

writeFileSync(OUTPUT_PATH, `${JSON.stringify(createBom(packageJson, rootTree), null, 2)}\n`);
