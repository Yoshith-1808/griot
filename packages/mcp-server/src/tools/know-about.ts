/**
 * @file packages/mcp-server/src/tools/know-about.ts
 * @description MCP Tool 3: `know_about`.
 * Aggregates all memories mentioning a specific individual and synthesizes a voice profile.
 */

import type { KnowAboutInput, KnowAboutOutput } from '@griot/shared';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { generateSpokenText } from '../bedrock/generation.js';
import { recordAuditLog } from '../lib/audit.js';
import { createScopedLogger } from '../lib/logger.js';
import { normalizePersonName } from '../lib/tag.js';

const log = createScopedLogger('Tool:know_about');

export const KnowAboutInputSchema = z.object({
  person: z.string().min(1, 'Person name cannot be empty'),
});

export const KnowAboutOutputSchema = z.object({
  person: z.string(),
  summary: z.string(),
  facts: z.array(z.string()),
  last_mentioned: z.string(),
});

export const knowAboutToolDefinition = {
  name: 'know_about',
  description:
    'Retrieves and synthesizes a spoken personal profile for any individual mentioned across past memories.',
  inputSchema: {
    type: 'object',
    properties: {
      person: {
        type: 'string',
        description: 'Name or relationship of the person (e.g. "Sarah", "Mom", "David").',
      },
    },
    required: ['person'],
  },
};

interface MemoryContentRow {
  content: string;
  occurred_at: string;
}

/**
 * Executes the `know_about` MCP tool.
 *
 * @param input - Raw or validated input parameters.
 * @param db - SQLite database client.
 * @returns {@link KnowAboutOutput} containing profile summary and facts.
 */
export async function handleKnowAbout(
  input: unknown,
  db: Database.Database,
): Promise<KnowAboutOutput> {
  log.info({ input }, 'Handling know_about tool execution');
  const parsed: KnowAboutInput = KnowAboutInputSchema.parse(input);
  const normalized = normalizePersonName(parsed.person);

  // 1. Fetch all non-deleted memories linked to this person
  const rows = db
    .prepare(`
      SELECT m.content, m.occurred_at
      FROM memories m
      JOIN memory_people mp ON m.id = mp.memory_id
      JOIN people p ON mp.person_id = p.id
      WHERE p.normalized_name = ? AND m.deleted_at IS NULL
      ORDER BY m.occurred_at DESC
    `)
    .all(normalized) as MemoryContentRow[];

  if (rows.length === 0) {
    return {
      person: parsed.person,
      summary: `I don't have any recorded memories about ${parsed.person} yet.`,
      facts: [],
      last_mentioned: new Date().toISOString(),
    };
  }

  const facts = rows.map((r) => r.content);
  const lastMentioned = rows[0].occurred_at;

  // 2. Synthesize spoken profile with Claude Sonnet
  const memoryBlock = rows.map((r, i) => `${i + 1}. [${r.occurred_at}] ${r.content}`).join('\n');
  const prompt = `
The user asked: "What do you know about ${parsed.person}?"
Here are all memories involving ${parsed.person}:
${memoryBlock}

Synthesize a warm, concise spoken summary of what you know about ${parsed.person}.
Strictly adhere to: Under 35 words, zero markdown or bullet points.
`.trim();

  const summary = await generateSpokenText(prompt);

  // 3. Record audit log
  recordAuditLog(db, 'know_about', { person: parsed.person, memoryCount: rows.length });

  return {
    person: parsed.person,
    summary,
    facts,
    last_mentioned: lastMentioned,
  };
}
