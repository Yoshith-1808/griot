/**
 * @file packages/mcp-server/src/tools/reflect.ts
 * @description MCP Tool 6 (Bonus): `reflect`.
 * Proactively digests the day's memories, surfacing themes, action items, and follow-ups.
 */

import type { ReflectInput, ReflectOutput } from '@griot/shared';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { generateSpokenText } from '../bedrock/generation.js';
import { recordAuditLog } from '../lib/audit.js';
import { createScopedLogger } from '../lib/logger.js';

const log = createScopedLogger('Tool:reflect');

export const ReflectInputSchema = z.object({
  date: z.string().optional(),
});

export const ReflectOutputSchema = z.object({
  date: z.string(),
  reflection: z.string(),
  highlights: z.array(z.string()),
  questions: z.array(z.string()),
});

export const reflectToolDefinition = {
  name: 'reflect',
  description:
    'Proactively digests the daily memory trail to synthesize thoughtful themes, highlights, and follow-up reflection questions.',
  inputSchema: {
    type: 'object',
    properties: {
      date: {
        type: 'string',
        description: 'Optional ISO-8601 date to reflect on (defaults to today).',
      },
    },
  },
};

interface MemoryContentRow {
  content: string;
  occurred_at: string;
}

/**
 * Executes the `reflect` MCP tool.
 *
 * @param input - Raw or validated input parameters.
 * @param db - SQLite database client.
 * @returns {@link ReflectOutput} with proactive digest.
 */
export async function handleReflect(input: unknown, db: Database.Database): Promise<ReflectOutput> {
  log.info({ input }, 'Handling reflect tool execution');
  const parsed: ReflectInput = ReflectInputSchema.parse(input || {});

  const targetDate = parsed.date ? new Date(parsed.date) : new Date();
  const dayStart = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
  ).toISOString();
  const dayEnd = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
    23,
    59,
    59,
  ).toISOString();

  const rows = db
    .prepare(`
      SELECT content, occurred_at
      FROM memories
      WHERE occurred_at >= ? AND occurred_at <= ? AND deleted_at IS NULL
      ORDER BY occurred_at ASC
    `)
    .all(dayStart, dayEnd) as MemoryContentRow[];

  if (rows.length === 0) {
    return {
      date: targetDate.toISOString().slice(0, 10),
      reflection: 'No memories were recorded today to reflect on.',
      highlights: [],
      questions: ['What was the most meaningful part of your day today?'],
    };
  }

  const memoryBlock = rows.map((r, i) => `${i + 1}. ${r.content}`).join('\n');
  const prompt = `
Reflect on the user's activities today:
${memoryBlock}

Provide a thoughtful, spoken 30-word reflection highlighting meaningful patterns or follow-ups.
Zero markdown or bullet points.
`.trim();

  const reflection = await generateSpokenText(prompt);
  const highlights = rows.slice(0, 3).map((r) => r.content);
  const questions = ['Is there anyone you wanted to follow up with from today?'];

  recordAuditLog(db, 'reflect', { date: targetDate.toISOString(), count: rows.length });

  return {
    date: targetDate.toISOString().slice(0, 10),
    reflection,
    highlights,
    questions,
  };
}
