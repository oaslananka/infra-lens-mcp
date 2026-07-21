import { afterAll, afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import Database from 'better-sqlite3';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  getBaseline,
  getHistory,
  getHistoryPage,
  getLatestObservationSnapshots,
  getObservationWindow,
  pruneSnapshots,
  saveSnapshot
} from '../../src/baseline.js';
import { closeAllDatabases, CURRENT_SCHEMA_VERSION, getDatabase } from '../../src/db.js';
import type { MetricSnapshot } from '../../src/types.js';

const TEST_ROOT = mkdtempSync(join(tmpdir(), 'infra-lens-mcp-baseline-'));

const makeSnapshot = (
  timestamp: number,
  host = 'baseline-host',
  cpuPercent = 25
): MetricSnapshot => ({
  timestamp,
  host,
  cpu: {
    usage_percent: cpuPercent,
    load_1: 0.7,
    load_5: 0.5,
    load_15: 0.3,
    core_count: 4
  },
  memory: {
    total_mb: 8192,
    used_mb: 2048,
    free_mb: 6144,
    usage_percent: 25,
    swap_used_mb: 0,
    swap_total_mb: 4096
  },
  disk: [{ filesystem: '/dev/sda1', mount: '/', total_gb: 100, used_gb: 20, usage_percent: 20 }],
  network: [{ interface: 'eth0', rx_bytes: 2048, tx_bytes: 1024 }],
  system: { failed_units: 0, kernel_error_events: 0 },
  processes: [
    { pid: 101, name: 'node', cpu_percent: 5, mem_percent: 3, command: 'node server.js' }
  ],
  os: { hostname: host, uptime_seconds: 1000, kernel: '6.8.0', distro: 'Ubuntu 24.04' },
  warnings: []
});

beforeEach(() => {
  process.env.INFRA_LENS_DB = join(TEST_ROOT, `baseline-${Date.now()}-${Math.random()}.db`);
});

afterEach(() => {
  closeAllDatabases();
  delete process.env.INFRA_LENS_RETENTION_DAYS;
});

afterAll(() => {
  if (existsSync(TEST_ROOT)) {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  }
});

describe('baseline persistence', () => {
  it('stores explicit baseline samples and calculates a labeled baseline', () => {
    const now = Date.now();

    saveSnapshot(makeSnapshot(now - 5 * 60_000), 'normal', 'baseline');
    saveSnapshot(makeSnapshot(now - 4 * 60_000), 'normal', 'baseline');
    saveSnapshot(makeSnapshot(now - 3 * 60_000), 'normal', 'baseline');

    const baseline = getBaseline('baseline-host', 'normal');

    expect(baseline).not.toBeNull();
    expect(baseline?.sample_count).toBe(3);
    expect(baseline?.cpu_samples).toHaveLength(3);
    expect(baseline?.memory_mean).toBe(25);
  });

  it('excludes observations from baseline calculations', () => {
    const now = Date.now();

    for (let index = 0; index < 3; index += 1) {
      saveSnapshot(
        makeSnapshot(now - (index + 1) * 60_000, 'baseline-host', 25),
        'default',
        'baseline'
      );
      saveSnapshot(makeSnapshot(now + index, 'baseline-host', 95), 'default', 'observation');
    }

    const baseline = getBaseline('baseline-host');

    expect(baseline?.sample_count).toBe(3);
    expect(baseline?.cpu_samples).toEqual([25, 25, 25]);
  });

  it('returns observation history points within the requested time window', () => {
    const now = Date.now();

    saveSnapshot(makeSnapshot(now - 2 * 60 * 60 * 1000));
    saveSnapshot(makeSnapshot(now - 30 * 60 * 1000));
    saveSnapshot(makeSnapshot(now - 10 * 60 * 1000));

    const history = getHistory('baseline-host', 'cpu', 1);

    expect(history).toHaveLength(2);
    expect(history[0]?.cpu_percent).toBe(25);
    expect(history.every((row) => row.classification === 'observation')).toBe(true);
  });

  it('returns observations by default and a named baseline stream when filtered', () => {
    const now = Date.now();

    saveSnapshot(makeSnapshot(now - 30 * 60 * 1000), 'default', 'observation');
    saveSnapshot(makeSnapshot(now - 20 * 60 * 1000), 'weekday-normal', 'baseline');
    saveSnapshot(makeSnapshot(now - 10 * 60 * 1000), 'weekday-normal', 'baseline');

    const observationHistory = getHistory('baseline-host', 'cpu', 1);
    const labeledHistory = getHistory('baseline-host', 'cpu', 1, 'weekday-normal');

    expect(observationHistory).toHaveLength(1);
    expect(labeledHistory).toHaveLength(2);
    expect(labeledHistory.every((row) => row.classification === 'baseline')).toBe(true);
  });

  it('records named schema migrations and stable history indexes', () => {
    const database = getDatabase();
    const migrations = database
      .prepare('SELECT version, name FROM schema_migrations ORDER BY version')
      .all() as Array<{ version: number; name: string }>;
    const indexes = database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'snapshots'")
      .all() as Array<{ name: string }>;

    expect(migrations).toEqual([
      { version: 1, name: 'snapshot-classification' },
      { version: 2, name: 'history-lifecycle-indexes' }
    ]);
    expect(indexes.map((row) => row.name)).toEqual(
      expect.arrayContaining([
        'idx_snapshots_host_classification_timestamp_id',
        'idx_snapshots_host_label_timestamp_id',
        'idx_snapshots_timestamp'
      ])
    );
  });

  it('prunes snapshots outside the default retention window and supports disabling retention', () => {
    const now = Date.now();
    saveSnapshot(makeSnapshot(now - 31 * 24 * 60 * 60 * 1000));
    saveSnapshot(makeSnapshot(now));

    expect(getDatabase().prepare('SELECT COUNT(*) AS count FROM snapshots').get()).toEqual({
      count: 1
    });

    process.env.INFRA_LENS_RETENTION_DAYS = '0';
    saveSnapshot(makeSnapshot(now - 60 * 24 * 60 * 60 * 1000, 'archive-host'));
    expect(pruneSnapshots(now)).toBe(0);
    expect(
      getDatabase()
        .prepare('SELECT COUNT(*) AS count FROM snapshots WHERE host = ?')
        .get('archive-host')
    ).toEqual({ count: 1 });
  });

  it('paginates deterministically when rows share a timestamp', () => {
    const timestamp = Date.now();
    for (let index = 0; index < 5; index += 1) {
      saveSnapshot(makeSnapshot(timestamp, 'page-host', 20 + index));
    }

    const first = getHistoryPage({
      host: 'page-host',
      metric: 'cpu',
      hours: 1,
      limit: 2,
      now: timestamp + 1000
    });
    const second = getHistoryPage({
      host: 'page-host',
      metric: 'cpu',
      hours: 1,
      limit: 2,
      cursor: first.next_cursor ?? undefined,
      now: timestamp + 1000
    });
    const third = getHistoryPage({
      host: 'page-host',
      metric: 'cpu',
      hours: 1,
      limit: 2,
      cursor: second.next_cursor ?? undefined,
      now: timestamp + 1000
    });

    expect(first.has_more).toBe(true);
    expect(second.has_more).toBe(true);
    expect(third.has_more).toBe(false);
    expect([...first.items, ...second.items, ...third.items].map((row) => row.cpu_percent)).toEqual(
      [20, 21, 22, 23, 24]
    );
    expect(
      new Set([...first.items, ...second.items, ...third.items].map((row) => row.id)).size
    ).toBe(5);
  });

  it('rejects cursors reused for a different history stream', () => {
    const timestamp = Date.now();
    saveSnapshot(makeSnapshot(timestamp, 'cursor-host'));
    saveSnapshot(makeSnapshot(timestamp + 1, 'cursor-host'));
    const first = getHistoryPage({
      host: 'cursor-host',
      metric: 'cpu',
      hours: 1,
      limit: 1,
      now: timestamp + 1000
    });

    expect(() =>
      getHistoryPage({
        host: 'other-host',
        metric: 'cpu',
        hours: 1,
        cursor: first.next_cursor ?? undefined,
        now: timestamp + 1000
      })
    ).toThrow('does not match');
  });

  it('returns one latest valid observation per host and counts invalid rows', () => {
    const now = Date.now();
    saveSnapshot(makeSnapshot(now - 3000, 'beta-host', 10));
    saveSnapshot(makeSnapshot(now - 2000, 'alpha-host', 20));
    saveSnapshot(makeSnapshot(now - 1000, 'alpha-host', 30));
    saveSnapshot(makeSnapshot(now + 1000, 'alpha-host', 99), 'newer-baseline', 'baseline');

    getDatabase()
      .prepare(
        `
        INSERT INTO snapshots (
          host, label, classification, timestamp,
          cpu_percent, memory_percent, load_1, raw_json
        ) VALUES (?, 'default', 'observation', ?, 0, 0, 0, ?)
      `
      )
      .run('broken-host', now, '{not-json');

    const latest = getLatestObservationSnapshots();

    expect(latest.invalidRows).toBe(1);
    expect(latest.snapshots.map((snapshot) => snapshot.host)).toEqual(['alpha-host', 'beta-host']);
    expect(latest.snapshots[0]?.timestamp).toBe(now - 1000);
    expect(latest.snapshots[0]?.cpu.usage_percent).toBe(30);
  });

  it('reads a bounded observation window in deterministic order and counts invalid rows', () => {
    const now = Date.now();
    saveSnapshot(makeSnapshot(now - 5000, 'window-host', 10));
    saveSnapshot(makeSnapshot(now - 4000, 'window-host', 20), 'healthy', 'baseline');
    saveSnapshot(makeSnapshot(now - 3000, 'window-host', 30));
    saveSnapshot(makeSnapshot(now - 2000, 'window-host', 40));
    saveSnapshot(makeSnapshot(now - 1000, 'other-host', 99));
    getDatabase()
      .prepare(
        `
        INSERT INTO snapshots (
          host, label, classification, timestamp,
          cpu_percent, memory_percent, load_1, raw_json
        ) VALUES (?, 'default', 'observation', ?, 0, 0, 0, ?)
      `
      )
      .run('window-host', now - 2500, '{bad-json');

    const window = getObservationWindow({
      host: 'window-host',
      from: now - 3500,
      to: now - 1500,
      limit: 2
    });

    expect(window.invalidRows).toBe(1);
    expect(window.truncated).toBe(false);
    expect(window.snapshots.map((snapshot) => snapshot.cpu.usage_percent)).toEqual([30, 40]);
    expect(window.snapshots.map((snapshot) => snapshot.timestamp)).toEqual([
      now - 3000,
      now - 2000
    ]);
  });

  it('validates observation window bounds', () => {
    expect(() => getObservationWindow({ host: 'x', from: 2, to: 1 })).toThrow('before');
    expect(() => getObservationWindow({ host: 'x', from: 0, to: 1, limit: 0 })).toThrow(
      'between 1 and 500'
    );
  });

  it('keeps :memory: databases stable across calls', () => {
    process.env.INFRA_LENS_DB = ':memory:';

    saveSnapshot(makeSnapshot(Date.now()), 'default', 'baseline');
    saveSnapshot(makeSnapshot(Date.now() + 1000), 'default', 'baseline');
    saveSnapshot(makeSnapshot(Date.now() + 2000), 'default', 'baseline');

    const baseline = getBaseline('baseline-host');

    expect(baseline).not.toBeNull();
    expect(baseline?.sample_count).toBe(3);
  });

  it('migrates legacy rows without loss using deterministic classification rules', () => {
    const databasePath = process.env.INFRA_LENS_DB!;
    const legacyDatabase = new Database(databasePath);
    legacyDatabase.exec(`
      CREATE TABLE snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        host TEXT NOT NULL,
        label TEXT DEFAULT 'default',
        timestamp INTEGER NOT NULL,
        cpu_percent REAL NOT NULL,
        memory_percent REAL NOT NULL,
        load_1 REAL NOT NULL,
        raw_json TEXT NOT NULL
      );
    `);

    const insert = legacyDatabase.prepare(`
      INSERT INTO snapshots (host, label, timestamp, cpu_percent, memory_percent, load_1, raw_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const now = Date.now();
    insert.run('baseline-host', 'default', now, 95, 25, 0.7, '{}');
    insert.run('baseline-host', 'weekday-normal', now - 1, 22, 25, 0.7, '{}');
    insert.run('baseline-host', 'weekday-normal', now - 2, 23, 25, 0.7, '{}');
    insert.run('baseline-host', 'weekday-normal', now - 3, 24, 25, 0.7, '{}');
    legacyDatabase.close();

    const migratedDatabase = getDatabase();
    const rows = migratedDatabase
      .prepare('SELECT label, classification FROM snapshots ORDER BY id ASC')
      .all() as Array<{ label: string; classification: string }>;

    expect(migratedDatabase.pragma('user_version', { simple: true })).toBe(CURRENT_SCHEMA_VERSION);
    expect(rows).toEqual([
      { label: 'default', classification: 'observation' },
      { label: 'weekday-normal', classification: 'baseline' },
      { label: 'weekday-normal', classification: 'baseline' },
      { label: 'weekday-normal', classification: 'baseline' }
    ]);
    expect(getHistory('baseline-host', 'cpu', 1)).toHaveLength(1);
    expect(getBaseline('baseline-host')).toBeNull();
    expect(getBaseline('baseline-host', 'weekday-normal')?.sample_count).toBe(3);
  });
});
