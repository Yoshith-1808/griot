/**
 * @file packages/mcp-server/tests/reflect.test.ts
 * @description Unit tests for MCP Tool 6 (Bonus): reflect.
 * Covers happy path (daily digest), edge case (day with zero memories), and error handling.
 */

import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { applyMigrations } from '../src/db/schema.js';
import { handleReflect } from '../src/tools/reflect.js';
import { handleRemember } from '../src/tools/remember.js';

describe('Tool: reflect', () => {
  let db: Database.Database;

  beforeEach(async () => {
    db = new Database(':memory:');
    applyMigrations(db);

    await handleRemember(
      {
        content: 'Reflected on the new MCP tool protocol with Marcus and team.',
      },
      db,
    );
  });

  it('Happy path: synthesizes daily reflection with highlights and questions', async () => {
    const result = await handleReflect({}, db);

    expect(result.date).toBeDefined();
    expect(result.reflection).toBeDefined();
    expect(result.highlights.length).toBeGreaterThan(0);
    expect(result.questions.length).toBeGreaterThan(0);
  });

  it('Edge case: handles empty date reflection gracefully', async () => {
    const result = await handleReflect(
      {
        date: '2019-01-01T00:00:00.000Z',
      },
      db,
    );

    expect(result.reflection).toContain('No memories were recorded');
    expect(result.highlights.length).toBe(0);
    expect(result.questions.length).toBeGreaterThan(0);
  });

  it('Edge case: handles undefined payload without throwing an exception', async () => {
    const result = await handleReflect(undefined, db);
    expect(result).toBeDefined();
    expect(result.date).toBeDefined();
  });
});
