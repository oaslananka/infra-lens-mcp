import { spawnSync } from 'node:child_process';

function runGit(args) {
  const result = spawnSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

const diff = runGit(['diff', '--exit-code', '--', 'docs/api']);
const status = runGit(['status', '--porcelain', '--', 'docs/api']);

if (diff.status !== 0 || status.stdout.trim().length > 0) {
  process.stderr.write(
    'API docs are out of date. Run pnpm run docs:api and commit docs/api changes.\n'
  );
  process.stderr.write(diff.stdout);
  process.stderr.write(status.stdout);
  process.exit(1);
}
