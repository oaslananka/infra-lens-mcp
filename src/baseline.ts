import { getDatabase } from './db.js';
import type {
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

export function saveSnapshot(
  snapshot: MetricSnapshot,
  label = 'default',
  classification: SnapshotClassification = 'observation'
): void {
  const database = getDatabase();
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
}

export function getBaseline(host: string, label = 'default') {
  const database = getDatabase();
  const rows = database
    .prepare(
      `
        SELECT cpu_percent, memory_percent, load_1
        FROM snapshots
        WHERE host = ? AND classification = 'baseline' AND label = ?
        ORDER BY timestamp DESC
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

export function getHistory(
  host: string,
  _metric: MetricName,
  hours: number,
  label?: string
): StoredSnapshotRow[] {
  const database = getDatabase();
  const since = Date.now() - hours * 60 * 60 * 1000;

  const query = label
    ? `
        SELECT timestamp, cpu_percent, memory_percent, load_1, raw_json, label, classification
        FROM snapshots
        WHERE host = ? AND label = ? AND timestamp > ?
        ORDER BY timestamp ASC
      `
    : `
        SELECT timestamp, cpu_percent, memory_percent, load_1, raw_json, label, classification
        FROM snapshots
        WHERE host = ? AND classification = 'observation' AND timestamp > ?
        ORDER BY timestamp ASC
      `;

  return (
    label
      ? database.prepare(query).all(host, label, since)
      : database.prepare(query).all(host, since)
  ) as StoredSnapshotRow[];
}
