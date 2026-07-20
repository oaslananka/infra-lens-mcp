#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const workspace = readFileSync('pnpm-workspace.yaml', 'utf8');
const governance = JSON.parse(readFileSync('dependency-overrides.json', 'utf8'));

function parseMapping(sectionName) {
  const lines = workspace.split(/\r?\n/);
  const values = new Map();
  let inSection = false;

  for (const line of lines) {
    if (line === `${sectionName}:`) {
      inSection = true;
      continue;
    }
    if (!inSection) continue;
    if (line && !line.startsWith(' ')) break;
    const match = line.match(/^ {2}(['"]?)([^:'"]+)\1:\s*(.+)$/);
    if (match) values.set(match[2], match[3].trim().replace(/^['"]|['"]$/g, ''));
  }
  return values;
}

function parseList(sectionName) {
  const lines = workspace.split(/\r?\n/);
  const values = [];
  let inSection = false;

  for (const line of lines) {
    if (line === `${sectionName}:`) {
      inSection = true;
      continue;
    }
    if (!inSection) continue;
    if (line && !line.startsWith(' ')) break;
    const match = line.match(/^ {2}-\s+['"]?(.+?)['"]?$/);
    if (match) values.push(match[1]);
  }
  return values;
}

function validateRecord(kind, key, record) {
  for (const field of ['owner', 'reason', 'upstream', 'reviewBy']) {
    if (!record?.[field]) throw new Error(`${kind} ${key} is missing ${field}`);
  }
  if (!/^https:\/\//.test(record.upstream)) {
    throw new Error(`${kind} ${key} must use an HTTPS upstream reference`);
  }
  const reviewBy = new Date(`${record.reviewBy}T23:59:59Z`);
  if (Number.isNaN(reviewBy.valueOf()))
    throw new Error(`${kind} ${key} has an invalid reviewBy date`);
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
  if (!overrides.has(name))
    throw new Error(`Governance metadata for ${name} has no active pnpm override`);
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
