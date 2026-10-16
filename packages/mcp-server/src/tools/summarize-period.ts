/**
 * @file packages/mcp-server/src/tools/summarize-period.ts
 * @description MCP Tool 4: `summarize_period`.
 * Fetches all memories across a day, week, or month and synthesizes a spoken narrative.
 */

import type { SummarizePeriodInput, SummarizePeriodOutput } from '@griot/shared';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { generateSpokenText } from '../bedrock/generation.js';
import { recordAuditLog } from '../lib/audit.js';
import { createScopedLogger } from '../lib/logger.js';

const log = createScopedLogger('Tool:summarize_period');

export const SummarizePeriodInputSchema = z.object({
  period: z.enum(['day', 'week', 'month']),
  anchor_date: z.string().optional(),
});

export const SummarizePeriodOutputSchema = z.object({
  period: z.enum(['day', 'week', 'month']),
  summary: z.string(),
  memory_count: z.number(),
});

export const summarizePeriodToolDefinition = {
  name: 'summarize_period',
  description:
    'Summarizes what happened over a given timeframe (day, week, or month) into a coherent spoken narrative for Alexa.',
  inputSchema: {
    type: 'object',
    properties: {
      period: {
        type: 'string',
        enum: ['day', 'week', 'month'],
        description: 'The duration of time to summarize ("day", "week", or "month").',
      },
      anchor_date: {
        type: 'string',
        description: 'Optional ISO-8601 anchor date (defaults to current date).',
      },
    },
    required: ['period'],
  },
};

interface MemoryRow {
  content: string;
  occurred_at: string;
}

/**
 * Executes the `summarize_period` MCP tool.
 *
 * @param input - Raw or validated input parameters.
 * @param db - SQLite database client.
 * @returns {@link SummarizePeriodOutput} with spoken summary and count.
 */
export async function handleSummarizePeriod(
  input: unknown,
  db: Database.Database,
): Promise<SummarizePeriodOutput> {
  log.info({ input }, 'Handling summarize_period tool execution');
  const parsed: SummarizePeriodInput = SummarizePeriodInputSchema.parse(input);

  const anchor = parsed.anchor_date ? new Date(parsed.anchor_date) : new Date();
  const startTime = new Date(anchor.getTime());

  if (parsed.period === 'day') {
    startTime.setDate(startTime.getDate() - 1);
  } else if (parsed.period === 'week') {
    startTime.setDate(startTime.getDate() - 7);
  } else if (parsed.period === 'month') {
    startTime.setDate(startTime.getDate() - 30);
  }

  const startIso = startTime.toISOString();
  const endIso = anchor.toISOString();

  // Fetch memories within range
  const rows = db
    .prepare(`
      SELECT content, occurred_at
      FROM memories
      WHERE occurred_at >= ? AND occurred_at <= ? AND deleted_at IS NULL
      ORDER BY occurred_at ASC
    `)
    .all(startIso, endIso) as MemoryRow[];

  if (rows.length === 0) {
    return {
      period: parsed.period,
      summary: `You have no memories recorded for this ${parsed.period}.`,
      memory_count: 0,
    };
  }

  const memoryBlock = rows.map((r, i) => `${i + 1}. [${r.occurred_at}] ${r.content}`).join('\n');
  const prompt = `
The user asked: "Summarize what happened this ${parsed.period}"
Here are all memories recorded across this timeframe:
${memoryBlock}

Provide a coherent, high-level spoken narrative summarizing the highlights of this ${parsed.period}.
Strictly adhere to: Around 45 words, zero markdown or bullet points, warm conversational tone.
`.trim();

  const summary = await generateSpokenText(prompt, { maxTokens: 250 });

  // Record audit log
  recordAuditLog(db, 'summarize_period', { period: parsed.period, memoryCount: rows.length });

  return {
    period: parsed.period,
    summary,
    memory_count: rows.length,
  };
}
