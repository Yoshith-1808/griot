/**
 * @file packages/mcp-server/src/lib/audit.ts
 * @description Immutable audit logging service for memory actions.
 * Guarantees privacy and full visibility into data access and deletions.
 */

import { randomUUID } from 'node:crypto';
import type { AuditLogEntry } from '@griot/shared';
import type Database from 'better-sqlite3';
import { createScopedLogger } from './logger.js';

const log = createScopedLogger('Audit');

/**
 * Appends an audit log entry to the SQLite database.
 *
 * @param db - Active better-sqlite3 database.
 * @param action - Action performed.
 * @param details - Payload or context metadata.
 * @param memoryId - Optional associated memory ID.
 * @returns The created {@link AuditLogEntry}.
 */
export function recordAuditLog(
  db: Database.Database,
  action: AuditLogEntry['action'],
  details: Record<string, unknown>,
  memoryId?: string | null,
): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: randomUUID(),
    action,
    memory_id: memoryId ?? null,
    details,
    created_at: new Date().toISOString(),
  };

  try {
    db.prepare(`
      INSERT INTO audit_logs (id, action, memory_id, details, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      entry.id,
      entry.action,
      entry.memory_id,
      JSON.stringify(entry.details),
      entry.created_at,
    );
  } catch (err) {
    log.error({ err, entry }, 'Failed to write audit log entry');
  }

  return entry;
}
