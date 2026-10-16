/**
 * @file packages/mcp-server/tests/know-about.test.ts
 * @description Unit tests for MCP Tool 3: know_about.
 * Covers happy path (person dossier), edge case (unknown person), and error case.
 */

import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { applyMigrations } from '../src/db/schema.js';
import { handleKnowAbout } from '../src/tools/know-about.js';
import { handleRemember } from '../src/tools/remember.js';

describe('Tool: know_about', () => {
  let db: Database.Database;

  beforeEach(async () => {
    db = new Database(':memory:');
    applyMigrations(db);

    await handleRemember(
      {
        content: 'Sarah pitched her Series A round yesterday and was celebrating.',
        people: ['Sarah'],
      },
      db,
    );

    await handleRemember(
      {
        content: "Sarah recommended reading 'Designing Data-Intensive Applications'.",
        people: ['Sarah'],
      },
      db,
    );
  });

  it('Happy path: synthesizes an accurate spoken profile with facts and last mentioned date', async () => {
    const result = await handleKnowAbout(
      {
        person: 'Sarah',
      },
      db,
    );

    expect(result.person).toBe('Sarah');
    expect(result.facts.length).toBe(2);
    expect(result.summary).toBeDefined();
    expect(result.last_mentioned).toBeDefined();
  });

  it('Edge case: handles unknown person gracefully without throwing an exception', async () => {
    const result = await handleKnowAbout(
      {
        person: 'UnknownStranger',
      },
      db,
    );

    expect(result.person).toBe('UnknownStranger');
    expect(result.facts.length).toBe(0);
    expect(result.summary).toContain("don't have any recorded memories");
  });

  it('Error case: rejects empty person name with validation error', async () => {
    await expect(
      handleKnowAbout(
        {
          person: '',
        },
        db,
      ),
    ).rejects.toThrow();
  });
});
