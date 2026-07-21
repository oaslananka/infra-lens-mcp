#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const PR_WORKFLOW = '.github/workflows/osv-scanner-pr.yml';
const FULL_WORKFLOW = '.github/workflows/osv-scanner-full.yml';
const OSV_SHA = '9a498708959aeaef5ef730655706c5a1df1edbc2';
const TRIVY_SHA = 'ed142fd0673e97e23eac54620cfb913e5ce36c25';

const failures = [];
const fail = (message) => failures.push(message);
const read = (path) => {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    fail(`${path} must exist.`);
    return '';
  }
};
const requireFragment = (content, fragment, message) => {
  if (!content.includes(fragment)) fail(message);
};

const pr = read(PR_WORKFLOW);
const full = read(FULL_WORKFLOW);
const security = read('.github/workflows/security.yml');
const dependencyReview = read('.github/workflows/dependency-review.yml');
const tooling = read('.github/TOOLING.md');
const controls = read('docs/governance/repository-controls.md');

for (const [content, label] of [
  [pr, 'PR'],
  [full, 'full']
]) {
  requireFragment(content, 'actions: read', `${label} scan must request actions: read.`);
  requireFragment(content, 'contents: read', `${label} scan must request contents: read.`);
  requireFragment(
    content,
    'security-events: write',
    `${label} scan must request security-events: write for SARIF.`
  );
  requireFragment(
    content,
    '--lockfile=pnpm-lock.yaml',
    `${label} scan must target pnpm-lock.yaml.`
  );
  requireFragment(content, 'fail-on-vuln: true', `${label} scan must fail closed.`);
  requireFragment(content, 'upload-sarif: true', `${label} scan must upload SARIF.`);
  requireFragment(content, `@${OSV_SHA}`, `${label} scan must pin OSV v2.3.8 by full SHA.`);
  if (/guided-remediation|osv-scanner\s+fix/i.test(content)) {
    fail(`${label} scan must not enable guided remediation.`);
  }
}

requireFragment(pr, 'pull_request:', 'PR scan must run for pull requests.');
requireFragment(pr, 'merge_group:', 'PR scan must support merge queues.');
requireFragment(
  pr,
  'osv-scanner-reusable-pr.yml',
  'PR scan must use the official delta reusable workflow.'
);
requireFragment(full, 'push:', 'Full scan must run on main pushes.');
requireFragment(full, 'schedule:', 'Full scan must run on a schedule.');
requireFragment(full, 'workflow_dispatch:', 'Full scan must support manual dispatch.');
requireFragment(
  full,
  'osv-scanner-reusable.yml',
  'Full scan must use the official single-scan reusable workflow.'
);
requireFragment(
  security,
  `aquasecurity/trivy-action@${TRIVY_SHA}`,
  'Trivy must remain pinned to known-safe v0.36.0.'
);
requireFragment(
  dependencyReview,
  'fail-on-severity: high',
  'Dependency Review must continue blocking high-severity additions.'
);

for (const [path, content] of [
  ['.github/TOOLING.md', tooling],
  ['docs/governance/repository-controls.md', controls]
]) {
  if (/\bsnyk\b/i.test(content)) {
    fail(`${path} must not retain Snyk as an active repository signal.`);
  }
  requireFragment(content, 'OSV-Scanner', `${path} must document OSV-Scanner.`);
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log('OSV-Scanner repository policy check passed.');
