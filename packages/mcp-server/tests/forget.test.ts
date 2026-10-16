/**
 * @file packages/mcp-server/tests/forget.test.ts
 * @description Unit tests for MCP Tool 5: forget.
 * Covers happy path (topic query, person), edge case (purge all confirmation), and error case.
 */

import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { applyMigrations } from '../src/db/schema.js';
import { handleForget } from '../src/tools/forget.js';
import { handleRemember } from '../src/tools/remember.js';

describe('Tool: forget', () => {
  let db: Database.Database;

  beforeEach(async () => {
    db = new Database(':memory:');
    applyMigrations(db);

    await handleRemember(
      {
        content: 'Ex-partner Alex called about picking up remaining furniture.',
        people: ['Alex'],
      },
      db,
    );

    await handleRemember(
      {
        content: 'Meeting with Sarah at Blue Bottle coffee.',
        people: ['Sarah'],
      },
      db,
    );
  });

  it('Happy path: soft deletes memories matching a specific person', async () => {
    const result = await handleForget(
      {
        person: 'Alex',
      },
      db,
    );

    expect(result.deleted_count).toBe(1);
    expect(result.message).toContain('Alex');

    // Verify soft deletion
    const active = db
      .prepare('SELECT COUNT(*) as count FROM memories WHERE deleted_at IS NULL')
      .get() as { count: number };
    expect(active.count).toBe(1);

    // Audit log was recorded
    const audit = db.prepare("SELECT * FROM audit_logs WHERE action = 'forget'").get();
    expect(audit).toBeDefined();
  });

  it('Edge case: supports full purge when all: true is explicitly provided', async () => {
    const result = await handleForget(
      {
        all: true,
      },
      db,
    );

    expect(result.deleted_count).toBe(2);

    const active = db
      .prepare('SELECT COUNT(*) as count FROM memories WHERE deleted_at IS NULL')
      .get() as { count: number };
    expect(active.count).toBe(0);
  });

  it('Error case: rejects empty parameters with Zod validation error', async () => {
    await expect(handleForget({}, db)).rejects.toThrow();
  });
});
