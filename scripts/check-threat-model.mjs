#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const model = JSON.parse(readFileSync(join(root, 'security/threat-model.json'), 'utf8'));
const mcp = JSON.parse(readFileSync(join(root, 'mcp.json'), 'utf8'));
const failures = [];
const requiredThreats = new Set([
  'TM-HTTP-ORIGIN',
  'TM-HTTP-HOST',
  'TM-HTTP-GATEWAY',
  'TM-TENANT-TARGET',
  'TM-SSH-SSRF',
  'TM-SSH-IDENTITY',
  'TM-SSH-HOSTKEY',
  'TM-RESOURCE-ABUSE',
  'TM-OUTPUT-INJECTION',
  'TM-DATA-LEAK',
  'TM-RELEASE-SUPPLYCHAIN',
  'TM-METRICS-EXPOSURE',
  'TM-OTLP-EGRESS'
]);

function fail(message) {
  failures.push(message);
}

if (model.schemaVersion !== 1 || typeof model.modelVersion !== 'string') {
  fail('Threat model must declare schemaVersion 1 and a modelVersion.');
}

const threats = Array.isArray(model.threats) ? model.threats : [];
const ids = new Set();
for (const threat of threats) {
  if (typeof threat.id !== 'string' || ids.has(threat.id)) {
    fail(`Threat IDs must be unique strings: ${String(threat.id)}.`);
    continue;
  }
  ids.add(threat.id);
  requiredThreats.delete(threat.id);

  if (!['low', 'medium', 'high'].includes(threat.risk)) {
    fail(`${threat.id} must declare a normalized risk.`);
  }
  if (!threat.owner || !Array.isArray(threat.mitigations) || threat.mitigations.length === 0) {
    fail(`${threat.id} must have an owner and at least one mitigation.`);
  }
  if (!threat.residualRisk) {
    fail(`${threat.id} must state residual risk.`);
  }
  if (
    threat.risk === 'high' &&
    !['mitigated', 'accepted', 'accepted-blocker'].includes(threat.status)
  ) {
    fail(`${threat.id} high risk must be mitigated or explicitly accepted.`);
  }
  if (threat.status.startsWith('accepted')) {
    const reviewBy = Date.parse(threat.acceptance?.reviewBy ?? '');
    if (!threat.acceptance?.approvedBy || !threat.acceptance?.reason || Number.isNaN(reviewBy)) {
      fail(`${threat.id} accepted risk must name approval, reason, and review date.`);
    }
  }
  if (!Array.isArray(threat.tests) || threat.tests.length === 0) {
    fail(`${threat.id} must map to executable evidence.`);
  } else {
    for (const evidence of threat.tests) {
      if (!existsSync(join(root, evidence))) {
        fail(`${threat.id} references missing evidence ${evidence}.`);
      }
    }
  }
}

if (requiredThreats.size > 0) {
  fail(`Missing required threats: ${[...requiredThreats].join(', ')}.`);
}

const hasAuthorizationBlocker = threats.some(
  (threat) => threat.id === 'TM-TENANT-TARGET' && threat.status === 'accepted-blocker'
);
if (hasAuthorizationBlocker && mcp.connector_readiness?.publishReady !== false) {
  fail('Connector publishReady must remain false while tenant-to-target authorization is blocked.');
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log(
  `Threat model passed: ${threats.length} threats, ${threats.filter((t) => t.risk === 'high').length} high-risk records.`
);
