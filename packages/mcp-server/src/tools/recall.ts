/**
 * @file packages/mcp-server/src/tools/recall.ts
 * @description MCP Tool 2: `recall`.
 * Embeds query, performs vector search across chunks, applies recency reranking,
 * and synthesizes a natural spoken response via Claude Sonnet.
 */

import type { RecallInput, RecallOutput, RecallResultItem } from '@griot/shared';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { generateEmbedding } from '../bedrock/embeddings.js';
import { generateSpokenText } from '../bedrock/generation.js';
import { recordAuditLog } from '../lib/audit.js';
import { createScopedLogger } from '../lib/logger.js';
import { normalizePersonName } from '../lib/tag.js';
import { calculateRerankedScore, cosineSimilarity, deserializeVector } from '../lib/vector.js';

const log = createScopedLogger('Tool:recall');

export const RecallInputSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty'),
  limit: z.number().int().min(1).max(20).optional().default(5),
  person: z.string().optional(),
  since: z.string().optional(),
});

export const RecallOutputSchema = z.object({
  results: z.array(
    z.object({
      content: z.string(),
      occurred_at: z.string(),
      relevance: z.number(),
    }),
  ),
  spoken: z.string(),
});

export const recallToolDefinition = {
  name: 'recall',
  description:
    'Searches user memories using semantic vector similarity and temporal reranking. Returns ranked memories and a natural spoken answer tailored for voice.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query or conversational question to recall.',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of memories to return (default 5).',
      },
      person: {
        type: 'string',
        description: 'Optional person filter (e.g. "David", "Mom").',
      },
      since: {
        type: 'string',
        description: 'Optional ISO-8601 date filter to exclude memories prior to this timestamp.',
      },
    },
    required: ['query'],
  },
};

interface MemoryCandidateRow {
  memory_id: string;
  chunk_content: string;
  full_content: string;
  occurred_at: string;
  embedding: Buffer;
}

/**
 * Executes the `recall` MCP tool.
 *
 * @param input - Raw or validated input parameters.
 * @param db - SQLite database client.
 * @returns {@link RecallOutput} containing ranked memories and spoken synthesis.
 */
export async function handleRecall(input: unknown, db: Database.Database): Promise<RecallOutput> {
  log.info({ input }, 'Handling recall tool execution');
  const parsed: RecallInput = RecallInputSchema.parse(input);

  // 1. Generate query embedding
  const queryEmbedding = await generateEmbedding(parsed.query, db);

  // 2. Fetch active memory candidates with optional filters
  let sql = `
    SELECT
      c.memory_id,
      c.content AS chunk_content,
      m.content AS full_content,
      m.occurred_at,
      c.embedding
    FROM memory_chunks c
    JOIN memories m ON c.memory_id = m.id
    WHERE m.deleted_at IS NULL
  `;
  const params: unknown[] = [];

  if (parsed.since) {
    sql += ' AND m.occurred_at >= ?';
    params.push(parsed.since);
  }

  if (parsed.person) {
    const normalized = normalizePersonName(parsed.person);
    sql += `
      AND m.id IN (
        SELECT mp.memory_id
        FROM memory_people mp
        JOIN people p ON mp.person_id = p.id
        WHERE p.normalized_name = ?
      )
    `;
    params.push(normalized);
  }

  const rows = db.prepare(sql).all(...params) as MemoryCandidateRow[];

  // 3. Compute cosine similarity & apply recency reranking
  const scoredItems: Array<RecallResultItem & { memory_id: string }> = [];
  const seenMemoryIds = new Set<string>();

  for (const row of rows) {
    const chunkVec = deserializeVector(row.embedding);
    const rawSim = cosineSimilarity(queryEmbedding, chunkVec);
    const rerankedScore = calculateRerankedScore(rawSim, row.occurred_at);

    const threshold = parsed.person ? 0.0 : 0.1;
    if (rawSim >= threshold) {
      scoredItems.push({
        memory_id: row.memory_id,
        content: row.full_content,
        occurred_at: row.occurred_at,
        relevance: Math.round(rerankedScore * 1000) / 1000,
      });
    }
  }

  // Deduplicate by memory_id, taking top score
  scoredItems.sort((a, b) => b.relevance - a.relevance);
  const deduplicated: RecallResultItem[] = [];
  for (const item of scoredItems) {
    if (!seenMemoryIds.has(item.memory_id)) {
      seenMemoryIds.add(item.memory_id);
      deduplicated.push({
        content: item.content,
        occurred_at: item.occurred_at,
        relevance: item.relevance,
      });
      if (deduplicated.length >= (parsed.limit || 5)) break;
    }
  }

  // 4. Synthesize natural spoken response via Claude Sonnet
  let spokenResponse: string;

  if (deduplicated.length === 0) {
    spokenResponse = "I couldn't find any memories matching that in your history.";
  } else {
    const contextLines = deduplicated
      .map((r, i) => `Memory ${i + 1} (${r.occurred_at}): ${r.content}`)
      .join('\n');

    const prompt = `
The user asked: "${parsed.query}"
Here are the relevant memories retrieved:
${contextLines}

Synthesize a direct, natural, spoken answer for Alexa to read aloud in response to the user's question.
Remember: Under 30 words, zero markdown or bullet points.
`.trim();

    spokenResponse = await generateSpokenText(prompt);
  }

  // 5. Audit log
  recordAuditLog(db, 'recall', { query: parsed.query, matchCount: deduplicated.length });

  return {
    results: deduplicated,
    spoken: spokenResponse,
  };
}
