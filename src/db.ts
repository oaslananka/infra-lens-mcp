import { mkdirSync } from 'node:fs';
import os from 'node:os';
import path, { dirname } from 'node:path';

import Database from 'better-sqlite3';

const DEFAULT_DB_PATH = path.join(os.homedir(), '.infra-lens-mcp', 'metrics.db');

export const CURRENT_SCHEMA_VERSION = 2;
const DEFAULT_RETENTION_DAYS = 30;

const databaseCache = new Map<string, Database.Database>();

interface TableInfoRow {
  name: string;
}

interface Migration {
  version: number;
  name: string;
  apply(database: Database.Database): void;
}

function hasTable(database: Database.Database, name: string): boolean {
  return Boolean(
    database.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name)
  );
}

function createSnapshotsTable(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS snapshots (
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

function createMigrationTable(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `);
}

function createSnapshotIndexes(database: Database.Database): void {
  database.exec(`
    DROP INDEX IF EXISTS idx_snapshots_host_label;
    DROP INDEX IF EXISTS idx_snapshots_host_timestamp;
    DROP INDEX IF EXISTS idx_snapshots_host_classification_timestamp;
    DROP INDEX IF EXISTS idx_snapshots_host_classification_label_timestamp;
    DROP INDEX IF EXISTS idx_snapshots_host_label_timestamp;
    CREATE INDEX IF NOT EXISTS idx_snapshots_host_classification_timestamp_id
      ON snapshots(host, classification, timestamp ASC, id ASC);
    CREATE INDEX IF NOT EXISTS idx_snapshots_host_label_timestamp_id
      ON snapshots(host, label, timestamp ASC, id ASC);
    CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp
      ON snapshots(timestamp ASC);
  `);
}

const migrations: Migration[] = [
  {
    version: 1,
    name: 'snapshot-classification',
    apply(database) {
      if (!hasTable(database, 'snapshots')) {
        createSnapshotsTable(database);
        return;
      }

      const columns = database.prepare('PRAGMA table_info(snapshots)').all() as TableInfoRow[];
      if (!columns.some((column) => column.name === 'classification')) {
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
  },
  {
    version: 2,
    name: 'history-lifecycle-indexes',
    apply(database) {
      createSnapshotsTable(database);
      createSnapshotIndexes(database);
    }
  }
];

function migrateDatabase(database: Database.Database): void {
  const userVersion = database.pragma('user_version', { simple: true }) as number;
  if (userVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Database schema version ${userVersion} is newer than supported version ${CURRENT_SCHEMA_VERSION}.`
    );
  }

  database.transaction(() => {
    createMigrationTable(database);
    const recorded = new Set(
      (
        database.prepare('SELECT version FROM schema_migrations').all() as Array<{
          version: number;
        }>
      ).map((row) => row.version)
    );

    for (const migration of migrations) {
      if (recorded.has(migration.version)) {
        continue;
      }
      migration.apply(database);
      database
        .prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)')
        .run(migration.version, migration.name, Date.now());
    }

    database.pragma(`user_version = ${CURRENT_SCHEMA_VERSION}`);
  })();
}

export function resolveDatabasePath(): string {
  return process.env.INFRA_LENS_DB ?? DEFAULT_DB_PATH;
}

export function resolveRetentionDays(): number {
  const raw = process.env.INFRA_LENS_RETENTION_DAYS?.trim();
  if (!raw) {
    return DEFAULT_RETENTION_DAYS;
  }

  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 0 || value > 3650) {
    throw new TypeError('INFRA_LENS_RETENTION_DAYS must be an integer between 0 and 3650.');
  }
  return value;
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
