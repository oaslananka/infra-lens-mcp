#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const policy = JSON.parse(readFileSync('audit-policy.json', 'utf8'));
const accepted = new Map(Object.entries(policy.acceptedAdvisories ?? {}));
const result = spawnSync(pnpm, ['audit', '--json'], { encoding: 'utf8' });

if (result.error || !result.stdout.trim()) {
  console.error(result.stderr || result.error?.message || 'pnpm audit produced no JSON output');
  process.exit(1);
}

let report;
try {
  report = JSON.parse(result.stdout);
} catch {
  console.error(result.stdout);
  console.error('pnpm audit returned invalid JSON');
  process.exit(1);
}

const seen = new Set();
for (const advisory of Object.values(report.advisories ?? {})) {
  const id = advisory.github_advisory_id;
  const severity = advisory.severity;
  if (['moderate', 'high', 'critical'].includes(severity)) {
    throw new Error(`${id} (${advisory.module_name}) is ${severity} and cannot be accepted`);
  }
  const record = accepted.get(id);
  if (!record) throw new Error(`${id} (${advisory.module_name}) is not covered by audit policy`);
  for (const field of ['module', 'severity', 'owner', 'reason', 'upstream', 'reviewBy']) {
    if (!record[field]) throw new Error(`Accepted advisory ${id} is missing ${field}`);
  }
  if (record.module !== advisory.module_name || record.severity !== severity) {
    throw new Error(`Accepted advisory ${id} metadata does not match the audit result`);
  }
  if (!record.upstream.startsWith('https://')) {
    throw new Error(`Accepted advisory ${id} must use an HTTPS upstream reference`);
  }
  const reviewBy = new Date(`${record.reviewBy}T23:59:59Z`);
  if (Number.isNaN(reviewBy.valueOf()) || reviewBy < new Date()) {
    throw new Error(`Accepted advisory ${id} expired on ${record.reviewBy}`);
  }
  seen.add(id);
}

for (const id of accepted.keys()) {
  if (!seen.has(id)) throw new Error(`Audit acceptance ${id} is stale and must be removed`);
}

console.log(`Audit policy passed: ${seen.size} low-severity advisory accepted with expiry.`);
