/**
 * @file packages/mcp-server/src/db/client.ts
 * @description SQLite database connection factory using better-sqlite3.
 * Configures WAL mode, busy timeout, and foreign key constraints for production performance.
 */

import Database from 'better-sqlite3';
import { resolvedDatabasePath } from '../config.js';
import { createScopedLogger } from '../lib/logger.js';
import { applyMigrations } from './schema.js';

const log = createScopedLogger('Database');

let dbInstance: Database.Database | null = null;

/**
 * Retrieves the singleton SQLite database instance.
 *
 * @param customPath - Optional path to SQLite file (useful for in-memory unit tests).
 * @returns An initialized and migrated better-sqlite3 Database.
 */
export function getDatabase(customPath?: string): Database.Database {
  if (dbInstance && !customPath) {
    return dbInstance;
  }

  const path = customPath || resolvedDatabasePath;
  log.info({ path }, 'Connecting to SQLite database');

  const db = new Database(path, {
    timeout: 5000,
  });

  // Optimize performance and enforce integrity
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');

  applyMigrations(db);

  if (!customPath) {
    dbInstance = db;
  }

  return db;
}

/**
 * Closes the active database connection if open.
 */
export function closeDatabase(): void {
  if (dbInstance) {
    log.info('Closing SQLite database connection');
    dbInstance.close();
    dbInstance = null;
  }
}
