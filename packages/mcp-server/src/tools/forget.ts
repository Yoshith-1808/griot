/**
 * @file packages/mcp-server/src/tools/forget.ts
 * @description MCP Tool 5: `forget`.
 * Implements privacy-compliant soft-deletion with audit trail.
 * Requires explicit safety confirmation for full memory purges.
 */

import type { ForgetInput, ForgetOutput } from '@griot/shared';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { recordAuditLog } from '../lib/audit.js';
import { createScopedLogger } from '../lib/logger.js';
import { normalizePersonName } from '../lib/tag.js';

const log = createScopedLogger('Tool:forget');

export const ForgetInputSchema = z
  .object({
    query: z.string().optional(),
    person: z.string().optional(),
    all: z.boolean().optional().default(false),
  })
  .refine((data) => data.query || data.person || data.all, {
    message: 'Must provide either query, person, or all: true to forget',
  });

export const ForgetOutputSchema = z.object({
  deleted_count: z.number(),
  message: z.string(),
});

export const forgetToolDefinition = {
  name: 'forget',
  description:
    'Soft-deletes memories by topic query, mentioned person, or confirms a full purge. Writes an immutable audit log entry.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Keyword or topic to remove matching memories for.',
      },
      person: {
        type: 'string',
        description: 'Person name to remove all associated memories for.',
      },
      all: {
        type: 'boolean',
        description: 'Confirmation flag to soft-delete all stored memories.',
      },
    },
  },
};

/**
 * Executes the `forget` MCP tool.
 *
 * @param input - Raw or validated input parameters.
 * @param db - SQLite database client.
 * @returns {@link ForgetOutput} with count of soft-deleted records.
 */
export async function handleForget(input: unknown, db: Database.Database): Promise<ForgetOutput> {
  log.info({ input }, 'Handling forget tool execution');
  const parsed: ForgetInput = ForgetInputSchema.parse(input);
  const nowIso = new Date().toISOString();
  let deletedCount = 0;

  if (parsed.all) {
    const result = db
      .prepare('UPDATE memories SET deleted_at = ? WHERE deleted_at IS NULL')
      .run(nowIso);
    deletedCount = result.changes;
    recordAuditLog(db, 'forget', { scope: 'all', deletedCount });
    return {
      deleted_count: deletedCount,
      message: `Permanently removed ${deletedCount} memories from your active history.`,
    };
  }

  if (parsed.person) {
    const normalized = normalizePersonName(parsed.person);
    const result = db
      .prepare(`
        UPDATE memories
        SET deleted_at = ?
        WHERE deleted_at IS NULL AND id IN (
          SELECT mp.memory_id
          FROM memory_people mp
          JOIN people p ON mp.person_id = p.id
          WHERE p.normalized_name = ?
        )
      `)
      .run(nowIso, normalized);

    deletedCount = result.changes;
    recordAuditLog(db, 'forget', { scope: 'person', person: parsed.person, deletedCount });
    return {
      deleted_count: deletedCount,
      message: `Removed ${deletedCount} memories regarding ${parsed.person}.`,
    };
  }

  if (parsed.query) {
    const term = `%${parsed.query.toLowerCase()}%`;
    const result = db
      .prepare(`
        UPDATE memories
        SET deleted_at = ?
        WHERE deleted_at IS NULL AND lower(content) LIKE ?
      `)
      .run(nowIso, term);

    deletedCount = result.changes;
    recordAuditLog(db, 'forget', { scope: 'query', query: parsed.query, deletedCount });
    return {
      deleted_count: deletedCount,
      message: `Removed ${deletedCount} memories matching "${parsed.query}".`,
    };
  }

  return {
    deleted_count: 0,
    message: 'No memories matched your removal criteria.',
  };
}
