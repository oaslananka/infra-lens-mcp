#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync('renovate.json', 'utf8'));
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
if (!rules.some((rule) => rule.matchManagers?.includes('pre-commit'))) {
  fail('pre-commit hook revisions must be managed by Renovate');
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
if (!managers.some((manager) => manager.depNameTemplate === '@sonar/scan')) {
  fail('the pinned SonarScanner for NPM must be managed by Renovate');
}

console.log('Renovate repository policy check passed.');
