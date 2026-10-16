/**
 * @file packages/mcp-server/tests/remember.test.ts
 * @description Unit tests for MCP Tool 1: remember.
 * Covers happy path, edge cases (entities, tags), and validation error cases.
 */

import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { applyMigrations } from '../src/db/schema.js';
import { handleRemember } from '../src/tools/remember.js';

describe('Tool: remember', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    applyMigrations(db);
  });

  it('Happy path: stores a simple memory and returns confirmed ID and message', async () => {
    const result = await handleRemember(
      {
        content: 'David mentioned he is severely allergic to shellfish.',
      },
      db,
    );

    expect(result.id).toBeDefined();
    expect(result.message).toBe('Remembered.');

    const saved = db.prepare('SELECT * FROM memories WHERE id = ?').get(result.id) as {
      content: string;
      metadata: string;
    };
    expect(saved).toBeDefined();
    expect(saved.content).toContain('David');

    const meta = JSON.parse(saved.metadata);
    expect(meta.people).toContain('David');
  });

  it('Edge case: handles caller-supplied tags, custom dates, and multiple people', async () => {
    const customDate = '2026-05-10T14:30:00.000Z';
    const result = await handleRemember(
      {
        content: 'Elena and Sarah discussed the new design architecture.',
        tags: ['architecture', 'work'],
        people: ['Elena'],
        occurred_at: customDate,
      },
      db,
    );

    expect(result.id).toBeDefined();

    const saved = db.prepare('SELECT * FROM memories WHERE id = ?').get(result.id) as {
      occurred_at: string;
      metadata: string;
    };
    expect(saved.occurred_at).toBe(customDate);

    const meta = JSON.parse(saved.metadata);
    expect(meta.tags).toEqual(['architecture', 'work']);
    expect(meta.people).toContain('Elena');
    expect(meta.people).toContain('Sarah');

    // Chunks exist
    const chunks = db
      .prepare('SELECT COUNT(*) as count FROM memory_chunks WHERE memory_id = ?')
      .get(result.id) as { count: number };
    expect(chunks.count).toBeGreaterThan(0);
  });

  it('Error case: rejects empty content with Zod validation error', async () => {
    await expect(
      handleRemember(
        {
          content: '',
        },
        db,
      ),
    ).rejects.toThrow();
  });
});
