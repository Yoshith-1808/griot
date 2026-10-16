/**
 * @file packages/mcp-server/src/db/schema.ts
 * @description SQLite schema definitions and initial migrations for Griot.
 * Creates tables for episodic memories, vector chunks, embedding cache, person entities, and audit logs.
 */

import type Database from 'better-sqlite3';
import { createScopedLogger } from '../lib/logger.js';

const log = createScopedLogger('SchemaMigration');

/**
 * Runs DDL statements to ensure all required tables and indexes exist.
 *
 * @param db - An active better-sqlite3 Database instance.
 */
export function applyMigrations(db: Database.Database): void {
  log.info('Applying SQLite database schema migrations');

  db.exec(`
    -- Memories table: Core episodic memory store
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      metadata TEXT NOT NULL DEFAULT '{}'
    );

    CREATE INDEX IF NOT EXISTS idx_memories_occurred_at ON memories(occurred_at);
    CREATE INDEX IF NOT EXISTS idx_memories_deleted_at ON memories(deleted_at);

    -- Memory chunks table: Stored text chunks and vector embeddings
    CREATE TABLE IF NOT EXISTS memory_chunks (
      id TEXT PRIMARY KEY,
      memory_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      embedding BLOB NOT NULL,
      FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_chunks_memory_id ON memory_chunks(memory_id);

    -- Embeddings cache: Deduplicates Titan Bedrock embedding API calls
    CREATE TABLE IF NOT EXISTS embeddings_cache (
      content_hash TEXT PRIMARY KEY,
      embedding BLOB NOT NULL,
      model_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- People entities: Tracks recognized individuals mentioned in memories
    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      normalized_name TEXT NOT NULL UNIQUE,
      first_seen_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_people_normalized ON people(normalized_name);

    -- Junction table: Memories to People
    CREATE TABLE IF NOT EXISTS memory_people (
      memory_id TEXT NOT NULL,
      person_id TEXT NOT NULL,
      PRIMARY KEY (memory_id, person_id),
      FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE,
      FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
    );

    -- Audit logs: Immutable history of all memory operations
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      memory_id TEXT,
      details TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
  `);

  log.info('SQLite database schema migrations applied successfully');
}
