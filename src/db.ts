import { mkdirSync } from 'node:fs';
import os from 'node:os';
import path, { dirname } from 'node:path';

import Database from 'better-sqlite3';

const DEFAULT_DB_PATH = path.join(os.homedir(), '.infra-lens-mcp', 'metrics.db');

export const CURRENT_SCHEMA_VERSION = 1;

const databaseCache = new Map<string, Database.Database>();

interface TableInfoRow {
  name: string;
}

function hasSnapshotsTable(database: Database.Database): boolean {
  return Boolean(
    database
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'snapshots'")
      .get()
  );
}

function createSnapshotsTable(database: Database.Database): void {
  database.exec(`
    CREATE TABLE snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      host TEXT NOT NULL,
      label TEXT NOT NULL DEFAULT 'default',
      classification TEXT NOT NULL DEFAULT 'observation'
        CHECK (classification IN ('observation', 'baseline')),
      timestamp INTEGER NOT NULL,
      cpu_percent REAL NOT NULL,
      memory_percent REAL NOT NULL,
      load_1 REAL NOT NULL,
      raw_json TEXT NOT NULL
    );
  `);
}

function createSnapshotIndexes(database: Database.Database): void {
  database.exec(`
    DROP INDEX IF EXISTS idx_snapshots_host_label;
    DROP INDEX IF EXISTS idx_snapshots_host_timestamp;
    CREATE INDEX IF NOT EXISTS idx_snapshots_host_classification_timestamp
      ON snapshots(host, classification, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_snapshots_host_classification_label_timestamp
      ON snapshots(host, classification, label, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_snapshots_host_label_timestamp
      ON snapshots(host, label, timestamp DESC);
  `);
}

function migrateDatabase(database: Database.Database): void {
  const userVersion = database.pragma('user_version', { simple: true }) as number;
  if (userVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Database schema version ${userVersion} is newer than supported version ${CURRENT_SCHEMA_VERSION}.`
    );
  }

  database.transaction(() => {
    if (!hasSnapshotsTable(database)) {
      createSnapshotsTable(database);
    } else {
      const columns = database.prepare('PRAGMA table_info(snapshots)').all() as TableInfoRow[];
      const hasClassification = columns.some((column) => column.name === 'classification');

      if (!hasClassification) {
        database.exec(`
          ALTER TABLE snapshots
          ADD COLUMN classification TEXT NOT NULL DEFAULT 'observation'
            CHECK (classification IN ('observation', 'baseline'));

          UPDATE snapshots
          SET label = 'default'
          WHERE label IS NULL;

          UPDATE snapshots
          SET classification = 'baseline'
          WHERE label <> 'default';
        `);
      }
    }

    createSnapshotIndexes(database);
    database.pragma(`user_version = ${CURRENT_SCHEMA_VERSION}`);
  })();
}

export function resolveDatabasePath(): string {
  return process.env.INFRA_LENS_DB ?? DEFAULT_DB_PATH;
}

export function getDatabase(): Database.Database {
  const databasePath = resolveDatabasePath();
  const cached = databaseCache.get(databasePath);
  if (cached) {
    return cached;
  }

  if (databasePath !== ':memory:') {
    mkdirSync(dirname(databasePath), { recursive: true });
  }

  const database = new Database(databasePath);
  try {
    database.pragma('journal_mode = WAL');
    migrateDatabase(database);
  } catch (error) {
    database.close();
    throw error;
  }

  databaseCache.set(databasePath, database);
  return database;
}

export function closeAllDatabases(): void {
  for (const database of databaseCache.values()) {
    database.close();
  }
  databaseCache.clear();
}
