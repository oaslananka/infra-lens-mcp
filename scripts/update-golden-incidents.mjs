#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
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
    const path = join(directory, file);
    const fixture = JSON.parse(readFileSync(path, 'utf8'));
    fixture.expected = analyzeSnapshot(fixture.snapshot);
    writeFileSync(path, `${JSON.stringify(fixture, null, 2)}\n`);
    console.log(`Updated ${file}`);
  }
} finally {
  closeAllDatabases();
  delete process.env.INFRA_LENS_DB;
  delete process.env.INFRA_LENS_RETENTION_DAYS;
}
