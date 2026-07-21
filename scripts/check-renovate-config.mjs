#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync('renovate.json', 'utf8'));
const miseConfig = readFileSync('.mise.toml', 'utf8');
const fail = (message) => {
  throw new Error(`Renovate policy check failed: ${message}`);
};
const hasExtend = (value) => config.extends?.includes(value);
const rules = config.packageRules ?? [];
const managers = config.customManagers ?? [];

if (config.$schema !== 'https://docs.renovatebot.com/renovate-schema.json') {
  fail('the official Renovate JSON schema must be declared');
}
if (!hasExtend(':dependencyDashboard') || !hasExtend(':configMigration')) {
  fail('Dependency Dashboard and config migration presets must remain enabled');
}
if (config.timezone !== 'Europe/Istanbul') {
  fail('timezone must remain Europe/Istanbul');
}
if (config.rebaseWhen !== 'behind-base-branch') {
  fail('Renovate branches must stay current with the protected base branch');
}
if (config.rebaseWhen !== 'behind-base-branch') {
  fail('Renovate branches must stay current with the protected base branch');
}
if (config.lockFileMaintenance?.enabled !== true) {
  fail('weekly pnpm lock-file maintenance must remain enabled');
}
if (config.vulnerabilityAlerts?.enabled !== true || config.osvVulnerabilityAlerts !== true) {
  fail('Renovate and OSV vulnerability alerts must remain enabled');
}
if (
  !rules.some(
    (rule) => rule.matchUpdateTypes?.includes('major') && rule.dependencyDashboardApproval
  )
) {
  fail('major updates must require Dependency Dashboard approval');
}
if (config['pre-commit']?.enabled !== true) {
  fail('the beta pre-commit manager must be explicitly enabled');
}
if (!rules.some((rule) => rule.matchManagers?.includes('pre-commit'))) {
  fail('pre-commit hook revisions must be managed by Renovate');
}
if (
  !rules.some(
    (rule) =>
      rule.matchManagers?.includes('mise') &&
      rule.matchPackageNames?.includes('pre-commit') &&
      rule.matchPackageNames?.includes('sonarqube-cli') &&
      rule.matchPackageNames?.includes('actionlint')
  )
) {
  fail(
    'mise-managed pre-commit, actionlint, and SonarQube CLI updates must be governed by Renovate'
  );
}
if (!/pre-commit\s*=\s*"4\.6\.0"/.test(miseConfig)) {
  fail('mise must pin pre-commit');
}
if (!/sonarqube-cli\s*=\s*"1\.4\.0\.3748"/.test(miseConfig)) {
  fail('mise must pin SonarQube CLI');
}
if (!/actionlint\s*=\s*"1\.7\.12"/.test(miseConfig)) {
  fail('mise must pin actionlint');
}
if (!managers.some((manager) => manager.depNameTemplate === 'pnpm')) {
  fail('workflow pnpm pins must be managed by a custom manager');
}
if (!managers.some((manager) => manager.datasourceTemplate === 'pypi')) {
  fail('pinned Python security tools must be managed by a custom manager');
}
if (!managers.some((manager) => manager.depNameTemplate === 'renovate/renovate')) {
  fail('the pinned Renovate validator must manage itself');
}

console.log('Renovate repository policy check passed.');
