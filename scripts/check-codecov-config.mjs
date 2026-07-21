import { readFileSync } from 'node:fs';

const config = readFileSync('codecov.yml', 'utf8');
const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
const jestConfig = readFileSync('jest.config.cjs', 'utf8');

const requiredConfigFragments = [
  'require_ci_to_pass: false',
  'target: auto',
  'threshold: 1%',
  'informational: true',
  'annotations: true',
  'flags:',
  '- tests'
];
for (const fragment of requiredConfigFragments) {
  if (!config.includes(fragment)) {
    throw new Error(`codecov.yml is missing required fragment: ${fragment}`);
  }
}

const requiredWorkflowFragments = [
  'id-token: write',
  'codecov/codecov-action@e53489f4d376d79066609109e7a95a29eb3740b1',
  'codecov/test-results-action@6ba3fdeec616fb91fd6a389b788a2366835a0fa2',
  'use_oidc: true',
  'coverage/lcov.info,coverage/cobertura-coverage.xml',
  'reports/junit/jest.xml',
  '!cancelled() && matrix.node-version == 24'
];
for (const fragment of requiredWorkflowFragments) {
  if (!workflow.includes(fragment)) {
    throw new Error(`CI workflow is missing required Codecov fragment: ${fragment}`);
  }
}

if (!jestConfig.includes("'jest-junit'") || !jestConfig.includes("outputName: 'jest.xml'")) {
  throw new Error('Jest must emit reports/junit/jest.xml for Codecov Test Analytics.');
}

console.log('Codecov repository policy check passed.');
