import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const POLICY_FILE = 'license-policy.json';
const PACKAGE_FILE = 'package.json';
const LICENSE_NOTICE = 'Permission is hereby granted, free of charge';

function readJson(file) {
  return JSON.parse(readFileSync(resolve(ROOT, file), 'utf8'));
}

function readText(file) {
  return readFileSync(resolve(ROOT, file), 'utf8');
}

function recordFailure(failures, condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function fileContains(file, expectedText) {
  const path = resolve(ROOT, file);
  return existsSync(path) && readText(file).includes(expectedText);
}

function loadPolicy() {
  const policy = readJson(POLICY_FILE);
  const allowedLicenseIds = new Set(policy.allowedLicenseIds ?? []);
  return { ...policy, allowedLicenseIds };
}

function stripOuterParens(expression) {
  let value = expression.trim();
  while (value.startsWith('(') && value.endsWith(')')) {
    let depth = 0;
    let wrapsWholeExpression = true;
    for (let index = 0; index < value.length; index += 1) {
      depth += value[index] === '(' ? 1 : 0;
      depth -= value[index] === ')' ? 1 : 0;
      if (depth === 0 && index < value.length - 1) {
        wrapsWholeExpression = false;
        break;
      }
    }
    if (!wrapsWholeExpression) {
      return value;
    }
    value = value.slice(1, -1).trim();
  }
  return value;
}

function splitTopLevel(expression, operator) {
  const marker = ` ${operator} `;
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < expression.length; index += 1) {
    depth += expression[index] === '(' ? 1 : 0;
    depth -= expression[index] === ')' ? 1 : 0;
    if (depth === 0 && expression.slice(index, index + marker.length) === marker) {
      parts.push(expression.slice(start, index).trim());
      start = index + marker.length;
    }
  }
  parts.push(expression.slice(start).trim());
  return parts;
}

function isAllowedExpression(expression, allowedLicenseIds) {
  const value = stripOuterParens(expression);
  const orParts = splitTopLevel(value, 'OR');
  if (orParts.length > 1) {
    return orParts.some((part) => isAllowedExpression(part, allowedLicenseIds));
  }
  const andParts = splitTopLevel(value, 'AND');
  if (andParts.length > 1) {
    return andParts.every((part) => isAllowedExpression(part, allowedLicenseIds));
  }
  return allowedLicenseIds.has(value);
}

function checkProjectLicensing(policy, failures) {
  const packageJson = readJson(PACKAGE_FILE);
  const reuseFile = policy.reuse?.metadataFile ?? 'REUSE.toml';
  const licenseFile = policy.reuse?.licenseFile ?? 'LICENSES/MIT.txt';
  recordFailure(
    failures,
    packageJson.license === policy.repositoryLicense,
    'package.json license must match repositoryLicense.'
  );
  recordFailure(
    failures,
    existsSync(resolve(ROOT, reuseFile)),
    `${reuseFile} is required for REUSE metadata.`
  );
  recordFailure(
    failures,
    existsSync(resolve(ROOT, licenseFile)),
    `${licenseFile} is required for REUSE license text.`
  );
  recordFailure(
    failures,
    fileContains(licenseFile, LICENSE_NOTICE),
    `${licenseFile} must contain MIT license text.`
  );
  recordFailure(
    failures,
    fileContains('LICENSE', LICENSE_NOTICE),
    'LICENSE must contain MIT license text.'
  );
}

function checkReuseMetadata(policy, failures) {
  const reuseFile = policy.reuse?.metadataFile ?? 'REUSE.toml';
  const content = existsSync(resolve(ROOT, reuseFile)) ? readText(reuseFile) : '';
  recordFailure(
    failures,
    /version\s*=\s*1/.test(content),
    `${reuseFile} must declare REUSE.toml version 1.`
  );
  recordFailure(
    failures,
    /path\s*=\s*\[\s*"\*\*"\s*\]/s.test(content),
    `${reuseFile} must cover project files.`
  );
  recordFailure(
    failures,
    /SPDX-FileCopyrightText\s*=/.test(content),
    `${reuseFile} must declare copyright metadata.`
  );
  recordFailure(
    failures,
    /SPDX-License-Identifier\s*=\s*"MIT"/.test(content),
    `${reuseFile} must declare MIT SPDX metadata.`
  );
}

function runPnpmLicenses() {
  const command = process.platform === 'win32' ? 'pnpm licenses list --json --long' : 'pnpm';
  const args = process.platform === 'win32' ? [] : ['licenses', 'list', '--json', '--long'];
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32'
  });
  if (result.error || result.status !== 0) {
    throw new Error(result.stderr || result.error?.message || 'pnpm licenses list failed.');
  }
  return JSON.parse(result.stdout);
}

function collectPackages(report) {
  const packages = [];
  for (const [fallbackLicense, entries] of Object.entries(report)) {
    for (const entry of entries) {
      const versions = entry.versions?.length ? entry.versions : ['unknown'];
      for (const version of versions) {
        packages.push({ name: entry.name, version, license: entry.license ?? fallbackLicense });
      }
    }
  }
  return packages;
}

function checkDependencyLicenses(policy, failures) {
  const packages = collectPackages(runPnpmLicenses());
  const blocked = packages.filter(
    (pkg) => !isAllowedExpression(pkg.license, policy.allowedLicenseIds)
  );
  for (const pkg of blocked) {
    failures.push(`${pkg.name}@${pkg.version} uses unapproved license expression: ${pkg.license}`);
  }
  return { blocked: blocked.length, checked: packages.length };
}

function reportAndExit(failures, stats) {
  if (failures.length > 0) {
    console.error(`License policy failed with ${failures.length} issue(s):`);
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }
  console.log(`License policy passed: ${stats.checked} dependency package entries checked.`);
}

const failures = [];
const policy = loadPolicy();
checkProjectLicensing(policy, failures);
checkReuseMetadata(policy, failures);
const stats = checkDependencyLicenses(policy, failures);
reportAndExit(failures, stats);
