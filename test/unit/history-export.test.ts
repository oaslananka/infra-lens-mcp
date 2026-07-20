import { afterEach, describe, expect, it } from '@jest/globals';

import { saveSnapshot } from '../../src/baseline.js';
import { closeAllDatabases } from '../../src/db.js';
import { collectHistoryExport, formatHistoryExport } from '../../src/history-export.js';
import type { MetricSnapshot } from '../../src/types.js';

function snapshot(timestamp: number, cpu: number): MetricSnapshot {
  return {
    timestamp,
    host: 'export-host',
    cpu: { usage_percent: cpu, load_1: 0.5, load_5: 0.4, load_15: 0.3, core_count: 4 },
    memory: {
      total_mb: 4096,
      used_mb: 1024,
      free_mb: 3072,
      usage_percent: 25,
      swap_used_mb: 0,
      swap_total_mb: 0
    },
    disk: [],
    network: [],
    system: { failed_units: 0, kernel_error_events: 0 },
    processes: [],
    os: { hostname: 'export-host', uptime_seconds: 1, kernel: '6.8', distro: 'Linux' },
    warnings: []
  };
}

afterEach(() => {
  closeAllDatabases();
  delete process.env.INFRA_LENS_DB;
  delete process.env.INFRA_LENS_RETENTION_DAYS;
});

describe('history export', () => {
  it('exports every page as JSON or NDJSON', () => {
    process.env.INFRA_LENS_DB = ':memory:';
    process.env.INFRA_LENS_RETENTION_DAYS = '0';
    const now = Date.now();
    for (let index = 0; index < 205; index += 1) {
      saveSnapshot(snapshot(now + index, index));
    }

    const records = collectHistoryExport({
      host: 'export-host',
      metric: 'cpu',
      hours: 1,
      now: now + 1000
    });
    const json = JSON.parse(formatHistoryExport(records, 'json')) as unknown[];
    const ndjson = formatHistoryExport(records, 'ndjson').trim().split('\n');

    expect(records).toHaveLength(205);
    expect(json).toHaveLength(205);
    expect(ndjson).toHaveLength(205);
    expect(records[204]?.metrics.cpu_percent).toBe(204);
  });
});
