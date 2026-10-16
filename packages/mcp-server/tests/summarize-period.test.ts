/**
 * @file packages/mcp-server/tests/summarize-period.test.ts
 * @description Unit tests for MCP Tool 4: summarize_period.
 * Covers happy path (week/month narrative), edge case (empty window), and error case.
 */

import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { applyMigrations } from '../src/db/schema.js';
import { handleRemember } from '../src/tools/remember.js';
import { handleSummarizePeriod } from '../src/tools/summarize-period.js';

describe('Tool: summarize_period', () => {
  let db: Database.Database;

  beforeEach(async () => {
    db = new Database(':memory:');
    applyMigrations(db);

    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    await handleRemember(
      {
        content: 'Completed the Bedrock streaming inference integration.',
        occurred_at: twoDaysAgo,
      },
      db,
    );
  });

  it('Happy path: summarizes memories across a week into a narrative', async () => {
    const result = await handleSummarizePeriod(
      {
        period: 'week',
      },
      db,
    );

    expect(result.period).toBe('week');
    expect(result.memory_count).toBeGreaterThanOrEqual(1);
    expect(result.summary).toBeDefined();
    expect(typeof result.summary).toBe('string');
  });

  it('Edge case: handles period with zero memories without crashing', async () => {
    // Look back at an anchor date from last year
    const result = await handleSummarizePeriod(
      {
        period: 'day',
        anchor_date: '2020-01-01T00:00:00.000Z',
      },
      db,
    );

    expect(result.memory_count).toBe(0);
    expect(result.summary).toContain('no memories');
  });

  it('Error case: rejects invalid period values with validation error', async () => {
    await expect(
      handleSummarizePeriod(
        {
          period: 'decade' as unknown as 'day',
        },
        db,
      ),
    ).rejects.toThrow();
  });
});
