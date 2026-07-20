#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { analyzeSnapshot } from '../dist/analyzer.js';
import { closeAllDatabases } from '../dist/db.js';

const directory = join(process.cwd(), 'examples', 'incidents');
const files = readdirSync(directory)
  .filter((file) => file.endsWith('.json'))
  .sort();
process.env.INFRA_LENS_DB = ':memory:';
process.env.INFRA_LENS_RETENTION_DAYS = '0';

try {
  for (const file of files) {
    const fixture = JSON.parse(readFileSync(join(directory, file), 'utf8'));
    assert.deepStrictEqual(
      analyzeSnapshot(fixture.snapshot),
      fixture.expected,
      `${file} output changed; review and run pnpm run golden:update only for intentional changes.`
    );
  }
  console.log(`Golden incident fixtures passed: ${files.length} reviewed scenarios.`);
} finally {
  closeAllDatabases();
  delete process.env.INFRA_LENS_DB;
  delete process.env.INFRA_LENS_RETENTION_DAYS;
}
