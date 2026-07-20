#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: process.env
  });
  if (result.error || result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!process.env.SONAR_TOKEN) {
  console.log('SONAR_TOKEN is not set; local SonarQube Cloud analysis was skipped.');
  process.exit(0);
}

if (!existsSync('coverage/lcov.info')) {
  run(pnpm, ['run', 'test:coverage']);
}

run(npx, ['--yes', '--package=@sonar/scan@5.0.0', 'sonar-scanner']);
