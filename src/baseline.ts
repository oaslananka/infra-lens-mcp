import type Database from 'better-sqlite3';

import { getDatabase, resolveRetentionDays } from './db.js';
import type {
  HistoryPage,
  HistoryPageOptions,
  MetricName,
  MetricSnapshot,
  SnapshotClassification,
  StoredSnapshotRow
} from './types.js';

interface BaselineRow {
  cpu_percent: number;
  memory_percent: number;
  load_1: number;
}

const RETENTION_MAINTENANCE_INTERVAL_MS = 60 * 60 * 1000;
const lastRetentionMaintenance = new WeakMap<Database.Database, number>();

interface HistoryCursorPayload {
  v: 1;
  host: string;
  label: string | null;
  since: number;
  timestamp: number;
  id: number;
}

function encodeCursor(payload: HistoryCursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodeCursor(cursor: string): HistoryCursorPayload {
  try {
    const payload = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8')
    ) as Partial<HistoryCursorPayload>;
    if (
      payload.v !== 1 ||
      typeof payload.host !== 'string' ||
      !(typeof payload.label === 'string' || payload.label === null) ||
      !Number.isSafeInteger(payload.since) ||
      !Number.isSafeInteger(payload.timestamp) ||
      !Number.isSafeInteger(payload.id)
    ) {
      throw new TypeError('invalid cursor fields');
    }
    return payload as HistoryCursorPayload;
  } catch (error) {
    throw new TypeError(
      `Invalid history cursor: ${error instanceof Error ? error.message : 'unknown error'}`,
      { cause: error }
    );
  }
}

function deleteExpiredSnapshots(database: Database.Database, now: number): number {
  const retentionDays = resolveRetentionDays();
  if (retentionDays === 0) {
    return 0;
  }
  const cutoff = now - retentionDays * 24 * 60 * 60 * 1000;
  return database.prepare('DELETE FROM snapshots WHERE timestamp < ?').run(cutoff).changes;
}

function maintainRetentionIfDue(database: Database.Database, now: number): number {
  const lastRun = lastRetentionMaintenance.get(database);
  if (lastRun !== undefined && now - lastRun < RETENTION_MAINTENANCE_INTERVAL_MS) {
    return 0;
  }
  const changes = deleteExpiredSnapshots(database, now);
  lastRetentionMaintenance.set(database, now);
  return changes;
}

export function pruneSnapshots(now = Date.now()): number {
  const database = getDatabase();
  const changes = deleteExpiredSnapshots(database, now);
  lastRetentionMaintenance.set(database, now);
  return changes;
}

export function saveSnapshot(
  snapshot: MetricSnapshot,
  label = 'default',
  classification: SnapshotClassification = 'observation'
): void {
  const database = getDatabase();
  database.transaction(() => {
    maintainRetentionIfDue(database, snapshot.timestamp);
    database
      .prepare(
        `
          INSERT INTO snapshots (
            host,
            label,
            classification,
            timestamp,
            cpu_percent,
            memory_percent,
            load_1,
            raw_json
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        snapshot.host,
        label,
        classification,
        snapshot.timestamp,
        snapshot.cpu.usage_percent,
        snapshot.memory.usage_percent,
        snapshot.cpu.load_1,
        JSON.stringify(snapshot)
      );
  })();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasFiniteNumbers(record: Record<string, unknown>, keys: string[]): boolean {
  return keys.every((key) => typeof record[key] === 'number' && Number.isFinite(record[key]));
}

function isMetricSnapshot(value: unknown): value is MetricSnapshot {
  if (!isRecord(value) || typeof value.host !== 'string' || !Number.isFinite(value.timestamp)) {
    return false;
  }
  if (
    !isRecord(value.cpu) ||
    !hasFiniteNumbers(value.cpu, ['usage_percent', 'load_1', 'load_5', 'load_15', 'core_count'])
  ) {
    return false;
  }
  if (
    !isRecord(value.memory) ||
    !hasFiniteNumbers(value.memory, [
      'total_mb',
      'used_mb',
      'free_mb',
      'usage_percent',
      'swap_used_mb',
      'swap_total_mb'
    ])
  ) {
    return false;
  }
  if (
    !Array.isArray(value.disk) ||
    !Array.isArray(value.network) ||
    !Array.isArray(value.processes)
  ) {
    return false;
  }
  if (
    !isRecord(value.system) ||
    !hasFiniteNumbers(value.system, ['failed_units', 'kernel_error_events'])
  ) {
    return false;
  }
  if (
    !isRecord(value.os) ||
    typeof value.os.hostname !== 'string' ||
    !Number.isFinite(value.os.uptime_seconds)
  ) {
    return false;
  }
  return Array.isArray(value.warnings);
}

export interface LatestObservationSnapshots {
  snapshots: MetricSnapshot[];
  invalidRows: number;
}

export interface ObservationWindowOptions {
  host: string;
  from: number;
  to: number;
  limit?: number;
}

export interface ObservationWindow {
  snapshots: MetricSnapshot[];
  invalidRows: number;
  truncated: boolean;
}

function parseSnapshotRow(row: { host: string; raw_json: string }): MetricSnapshot | null {
  try {
    const parsed: unknown = JSON.parse(row.raw_json);
    return isMetricSnapshot(parsed) && parsed.host === row.host ? parsed : null;
  } catch {
    return null;
  }
}

export function getObservationWindow(options: ObservationWindowOptions): ObservationWindow {
  const limit = options.limit ?? 200;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500) {
    throw new TypeError('Observation window limit must be an integer between 1 and 500.');
  }
  if (
    !Number.isFinite(options.from) ||
    !Number.isFinite(options.to) ||
    options.from >= options.to
  ) {
    throw new TypeError('Observation window from must be before to.');
  }

  const scanLimit = Math.min(2000, Math.max(limit + 1, limit * 4));
  const rows = getDatabase()
    .prepare(
      `
        SELECT host, raw_json
        FROM snapshots
        WHERE host = ?
          AND classification = 'observation'
          AND timestamp >= ?
          AND timestamp < ?
        ORDER BY timestamp ASC, id ASC
        LIMIT ?
      `
    )
    .all(options.host, options.from, options.to, scanLimit) as Array<{
    host: string;
    raw_json: string;
  }>;

  const snapshots: MetricSnapshot[] = [];
  let invalidRows = 0;
  for (const row of rows) {
    const snapshot = parseSnapshotRow(row);
    if (!snapshot) {
      invalidRows += 1;
      continue;
    }
    if (snapshots.length < limit) snapshots.push(snapshot);
  }

  return {
    snapshots,
    invalidRows,
    truncated:
      rows.length === scanLimit ||
      rows.length > snapshots.length + invalidRows ||
      (snapshots.length >= limit && rows.length > limit)
  };
}

export function getLatestObservationSnapshots(): LatestObservationSnapshots {
  const rows = getDatabase()
    .prepare(
      `
      WITH ranked AS (
        SELECT host, raw_json,
          ROW_NUMBER() OVER (PARTITION BY host ORDER BY timestamp DESC, id DESC) AS rank
        FROM snapshots
        WHERE classification = 'observation'
      )
      SELECT host, raw_json
      FROM ranked
      WHERE rank = 1
      ORDER BY host ASC
    `
    )
    .all() as Array<{ host: string; raw_json: string }>;

  const snapshots: MetricSnapshot[] = [];
  let invalidRows = 0;
  for (const row of rows) {
    const snapshot = parseSnapshotRow(row);
    if (!snapshot) {
      invalidRows += 1;
      continue;
    }
    snapshots.push(snapshot);
  }
  return { snapshots, invalidRows };
}

export function getBaseline(host: string, label = 'default') {
  const rows = getDatabase()
    .prepare(
      `
        SELECT cpu_percent, memory_percent, load_1
        FROM snapshots
        WHERE host = ? AND classification = 'baseline' AND label = ?
        ORDER BY timestamp DESC, id DESC
        LIMIT 100
      `
    )
    .all(host, label) as BaselineRow[];

  if (rows.length < 3) {
    return null;
  }

  return {
    cpu_samples: rows.map((row) => row.cpu_percent),
    memory_mean: rows.reduce((sum, row) => sum + row.memory_percent, 0) / rows.length,
    load_mean: rows.reduce((sum, row) => sum + row.load_1, 0) / rows.length,
    sample_count: rows.length
  };
}

function historyWhere(label: string | undefined): string {
  return label ? 'host = ? AND label = ?' : "host = ? AND classification = 'observation'";
}

export function getHistoryPage(options: HistoryPageOptions): HistoryPage {
  const limit = options.limit ?? 100;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200) {
    throw new TypeError('History page limit must be an integer between 1 and 200.');
  }

  const decoded = options.cursor ? decodeCursor(options.cursor) : null;
  const label = options.label ?? null;
  if (decoded && (decoded.host !== options.host || decoded.label !== label)) {
    throw new TypeError('History cursor does not match the requested host or label.');
  }

  const since = decoded?.since ?? (options.now ?? Date.now()) - options.hours * 60 * 60 * 1000;
  const where = historyWhere(options.label);
  const cursorClause = decoded ? 'AND (timestamp > ? OR (timestamp = ? AND id > ?))' : '';
  const query = `
    SELECT id, timestamp, cpu_percent, memory_percent, load_1, raw_json, label, classification
    FROM snapshots
    WHERE ${where} AND timestamp > ? ${cursorClause}
    ORDER BY timestamp ASC, id ASC
    LIMIT ?
  `;
  const params: unknown[] = options.label
    ? [options.host, options.label, since]
    : [options.host, since];
  if (decoded) {
    params.push(decoded.timestamp, decoded.timestamp, decoded.id);
  }
  params.push(limit + 1);

  const rows = getDatabase()
    .prepare(query)
    .all(...params) as StoredSnapshotRow[];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items.at(-1);
  return {
    items,
    has_more: hasMore,
    next_cursor:
      hasMore && last
        ? encodeCursor({
            v: 1,
            host: options.host,
            label,
            since,
            timestamp: last.timestamp,
            id: last.id ?? 0
          })
        : null
  };
}

export function getHistory(
  host: string,
  _metric: MetricName,
  hours: number,
  label?: string
): StoredSnapshotRow[] {
  const since = Date.now() - hours * 60 * 60 * 1000;
  const where = historyWhere(label);
  const query = `
    SELECT id, timestamp, cpu_percent, memory_percent, load_1, raw_json, label, classification
    FROM snapshots
    WHERE ${where} AND timestamp > ?
    ORDER BY timestamp ASC, id ASC
  `;
  return (
    label
      ? getDatabase().prepare(query).all(host, label, since)
      : getDatabase().prepare(query).all(host, since)
  ) as StoredSnapshotRow[];
}
