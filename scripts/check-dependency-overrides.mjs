#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const workspace = readFileSync('pnpm-workspace.yaml', 'utf8');
const governance = JSON.parse(readFileSync('dependency-overrides.json', 'utf8'));

function stripYamlScalar(value) {
  const trimmed = value.trim();
  const first = trimmed.at(0);
  const last = trimmed.at(-1);
  if ((first === "'" && last === "'") || (first === '"' && last === '"')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function sectionLines(sectionName) {
  const lines = workspace.split(/\r?\n/);
  const start = lines.indexOf(`${sectionName}:`);
  if (start < 0) return [];

  const section = [];
  for (const line of lines.slice(start + 1)) {
    if (line && !line.startsWith(' ')) break;
    if (line) section.push(line);
  }
  return section;
}

function parseMapping(sectionName) {
  const values = new Map();
  for (const line of sectionLines(sectionName)) {
    if (!line.startsWith('  ') || line.startsWith('    ')) continue;
    const entry = line.slice(2);
    const separator = entry.indexOf(':');
    if (separator < 1) continue;
    const key = stripYamlScalar(entry.slice(0, separator));
    const value = stripYamlScalar(entry.slice(separator + 1));
    if (key && value) values.set(key, value);
  }
  return values;
}

function parseList(sectionName) {
  const values = [];
  for (const line of sectionLines(sectionName)) {
    if (!line.startsWith('  - ')) continue;
    values.push(stripYamlScalar(line.slice(4)));
  }
  return values;
}

function validateRecord(kind, key, record) {
  for (const field of ['owner', 'reason', 'upstream', 'reviewBy']) {
    if (!record?.[field]) throw new Error(`${kind} ${key} is missing ${field}`);
  }
  if (!record.upstream.startsWith('https://')) {
    throw new Error(`${kind} ${key} must use an HTTPS upstream reference`);
  }
  const reviewBy = new Date(`${record.reviewBy}T23:59:59Z`);
  if (Number.isNaN(reviewBy.valueOf())) {
    throw new TypeError(`${kind} ${key} has an invalid reviewBy date`);
  }
  if (reviewBy < new Date()) throw new Error(`${kind} ${key} expired on ${record.reviewBy}`);
}

const overrides = parseMapping('overrides');
const governedOverrides = new Map(Object.entries(governance.overrides ?? {}));

for (const [name, version] of overrides) {
  const record = governedOverrides.get(name);
  if (!record) throw new Error(`Override ${name} is missing governance metadata`);
  validateRecord('Override', name, record);
  if (record.version !== version) {
    throw new Error(
      `Override ${name} version ${version} does not match governance version ${record.version}`
    );
  }
}
for (const name of governedOverrides.keys()) {
  if (!overrides.has(name)) {
    throw new Error(`Governance metadata for ${name} has no active pnpm override`);
  }
}

const exceptions = parseList('minimumReleaseAgeExclude');
const governedExceptions = new Map(Object.entries(governance.releaseAgeExceptions ?? {}));
for (const item of exceptions) {
  const record = governedExceptions.get(item);
  if (!record) throw new Error(`Release-age exception ${item} is missing governance metadata`);
  validateRecord('Release-age exception', item, record);
}
for (const item of governedExceptions.keys()) {
  if (!exceptions.includes(item)) {
    throw new Error(`Governance metadata for ${item} has no active release-age exception`);
  }
}

console.log(
  `Dependency override governance passed: ${overrides.size} overrides, ${exceptions.length} release-age exceptions.`
);
