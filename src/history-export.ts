import { getHistoryPage } from './baseline.js';
import type { HistoryPageOptions, StoredSnapshotRow } from './types.js';

export type HistoryExportFormat = 'json' | 'ndjson';

export interface HistoryExportRecord {
  id: number | null;
  host: string;
  label: string;
  classification: string;
  timestamp: number;
  metrics: {
    cpu_percent: number;
    memory_percent: number;
    load_1: number;
  };
  snapshot: unknown;
}

function toExportRecord(host: string, row: StoredSnapshotRow): HistoryExportRecord {
  let snapshot: unknown;
  try {
    snapshot = JSON.parse(row.raw_json) as unknown;
  } catch {
    snapshot = row.raw_json;
  }

  return {
    id: row.id ?? null,
    host,
    label: row.label,
    classification: row.classification,
    timestamp: row.timestamp,
    metrics: {
      cpu_percent: row.cpu_percent,
      memory_percent: row.memory_percent,
      load_1: row.load_1
    },
    snapshot
  };
}

export function collectHistoryExport(options: HistoryPageOptions): HistoryExportRecord[] {
  const records: HistoryExportRecord[] = [];
  let cursor = options.cursor;

  do {
    const page = getHistoryPage({ ...options, limit: 200, cursor });
    records.push(...page.items.map((row) => toExportRecord(options.host, row)));
    cursor = page.next_cursor ?? undefined;
  } while (cursor);

  return records;
}

export function formatHistoryExport(
  records: HistoryExportRecord[],
  format: HistoryExportFormat
): string {
  if (format === 'ndjson') {
    return (
      records.map((record) => JSON.stringify(record)).join('\n') + (records.length ? '\n' : '')
    );
  }
  return `${JSON.stringify(records, null, 2)}\n`;
}
