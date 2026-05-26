import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const POLICY_FILE = 'package-size-policy.json';

function readJson(file) {
  return JSON.parse(readFileSync(resolve(ROOT, file), 'utf8'));
}

function runNpmPackJson() {
  const command =
    process.platform === 'win32' ? 'npm pack --dry-run --json --ignore-scripts' : 'npm';
  const args =
    process.platform === 'win32' ? [] : ['pack', '--dry-run', '--json', '--ignore-scripts'];
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32'
  });
  if (result.error || result.status !== 0) {
    throw new Error(result.stderr || result.error?.message || 'npm pack --dry-run --json failed.');
  }
  return JSON.parse(result.stdout)[0];
}

function formatBytes(bytes) {
  return `${bytes} bytes`;
}

function assertBudget(name, actual, maximum, failures) {
  if (actual > maximum) {
    failures.push(`${name} ${formatBytes(actual)} exceeds budget ${formatBytes(maximum)}.`);
  }
}

function validatePackageSize(packResult, policy) {
  const failures = [];
  assertBudget('package size', packResult.size, policy.maxPackageSizeBytes, failures);
  assertBudget('unpacked size', packResult.unpackedSize, policy.maxUnpackedSizeBytes, failures);
  if (packResult.entryCount > policy.maxFileCount) {
    failures.push(`file count ${packResult.entryCount} exceeds budget ${policy.maxFileCount}.`);
  }
  return failures;
}

function reportAndExit(packResult, policy, failures) {
  if (failures.length > 0) {
    console.error(`Package size policy failed for ${packResult.name}@${packResult.version}:`);
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(
    `Package size policy passed: ${formatBytes(packResult.size)} <= ${formatBytes(policy.maxPackageSizeBytes)}, ` +
      `${formatBytes(packResult.unpackedSize)} <= ${formatBytes(policy.maxUnpackedSizeBytes)}, ` +
      `${packResult.entryCount} files <= ${policy.maxFileCount}.`
  );
}

const policy = readJson(POLICY_FILE);
const packResult = runNpmPackJson();
const failures = validatePackageSize(packResult, policy);
reportAndExit(packResult, policy, failures);
