#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const commands = [
  {
    command: process.platform === 'win32' ? 'pre-commit.exe' : 'pre-commit',
    name: 'pre-commit',
    install: 'mise install or pipx install pre-commit'
  }
];

for (const tool of commands) {
  const version = spawnSync(tool.command, ['--version'], { encoding: 'utf8' });
  if (version.error || version.status !== 0) {
    console.error(
      `${tool.name} is required. Install it with \`${tool.install}\` and rerun this command.`
    );
    process.exit(1);
  }
}

const install = spawnSync(
  commands[0].command,
  ['install', '--install-hooks', '--hook-type', 'pre-commit', '--hook-type', 'pre-push'],
  { stdio: 'inherit' }
);

if (install.error || install.status !== 0) {
  console.error('Failed to install repository Git hooks.');
  process.exit(install.status ?? 1);
}

console.log('Installed pre-commit and pre-push hooks.');
