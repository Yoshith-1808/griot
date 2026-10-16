/**
 * @file packages/mcp-server/tests/recall.test.ts
 * @description Unit tests for MCP Tool 2: recall.
 * Covers happy path (semantic ranking), edge case (person filter, zero match), and error case.
 */

import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { applyMigrations } from '../src/db/schema.js';
import { handleRecall } from '../src/tools/recall.js';
import { handleRemember } from '../src/tools/remember.js';

describe('Tool: recall', () => {
  let db: Database.Database;

  beforeEach(async () => {
    db = new Database(':memory:');
    applyMigrations(db);

    await handleRemember(
      {
        content: 'David mentioned he is severely allergic to shellfish and peanuts.',
        tags: ['dietary'],
        people: ['David'],
      },
      db,
    );

    await handleRemember(
      {
        content:
          'Ordered two bags of fresh Kenyan AA single-origin coffee beans from Counter Culture.',
        tags: ['coffee'],
      },
      db,
    );
  });

  it('Happy path: semantically retrieves relevant memory and returns spoken answer', async () => {
    const result = await handleRecall(
      {
        query: 'What is David allergic to?',
      },
      db,
    );

    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0].content).toContain('allergic');
    expect(result.results[0].relevance).toBeGreaterThan(0);
    expect(result.spoken).toBeDefined();
    expect(typeof result.spoken).toBe('string');
  });

  it('Edge case: handles person filter and queries with no matches gracefully', async () => {
    // Person filter matches
    const filtered = await handleRecall(
      {
        query: 'dinner',
        person: 'David',
      },
      db,
    );
    expect(filtered.results.length).toBeGreaterThan(0);

    // Completely unrelated query
    const noMatch = await handleRecall(
      {
        query: 'quantum cryptography supercomputers',
      },
      db,
    );
    expect(noMatch.spoken).toBeDefined();
  });

  it('Error case: rejects empty query with Zod validation error', async () => {
    await expect(
      handleRecall(
        {
          query: '',
        },
        db,
      ),
    ).rejects.toThrow();
  });
});
