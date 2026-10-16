/**
 * @file packages/mcp-server/src/tools/remember.ts
 * @description MCP Tool 1: `remember`.
 * Chunks content, generates Titan embeddings, stores in SQLite, extracts entities, and records audit log.
 */

import { randomUUID } from 'node:crypto';
import type { RememberInput, RememberOutput } from '@griot/shared';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { generateEmbedding } from '../bedrock/embeddings.js';
import { recordAuditLog } from '../lib/audit.js';
import { chunkText } from '../lib/chunk.js';
import { createScopedLogger } from '../lib/logger.js';
import { extractPeople, normalizePersonName } from '../lib/tag.js';
import { serializeVector } from '../lib/vector.js';

const log = createScopedLogger('Tool:remember');

export const RememberInputSchema = z.object({
  content: z.string().min(1, 'Memory content cannot be empty'),
  tags: z.array(z.string()).optional().default([]),
  people: z.array(z.string()).optional().default([]),
  occurred_at: z.string().optional(),
});

export const RememberOutputSchema = z.object({
  id: z.string(),
  message: z.string(),
});

/**
 * Tool definition conforming to MCP schema.
 */
export const rememberToolDefinition = {
  name: 'remember',
  description:
    'Stores a new episodic memory. Automatically chunks the text, creates vector embeddings using Amazon Titan v2, indexes entities and people mentioned, and logs the action.',
  inputSchema: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'The natural language statement, fact, or event to remember.',
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional categorization tags (e.g. ["health", "allergy", "dinner"]).',
      },
      people: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional names of people explicitly associated with this memory.',
      },
      occurred_at: {
        type: 'string',
        description: 'Optional ISO-8601 timestamp for when the event occurred (defaults to now).',
      },
    },
    required: ['content'],
  },
};

/**
 * Executes the `remember` MCP tool.
 *
 * @param input - Validated or raw input parameters.
 * @param db - SQLite database client.
 * @returns {@link RememberOutput} with stored ID and message.
 */
export async function handleRemember(
  input: unknown,
  db: Database.Database,
): Promise<RememberOutput> {
  log.info({ input }, 'Handling remember tool execution');
  const parsed: RememberInput = RememberInputSchema.parse(input);

  const memoryId = randomUUID();
  const nowIso = new Date().toISOString();
  const occurredAt = parsed.occurred_at || nowIso;

  // Extract entities & combine with caller-provided people
  const detectedPeople = extractPeople(parsed.content);
  const combinedPeople = Array.from(new Set([...(parsed.people || []), ...detectedPeople]));

  const metadata = {
    tags: parsed.tags || [],
    people: combinedPeople,
  };

  // 1. Insert core memory
  db.prepare(`
    INSERT INTO memories (id, content, occurred_at, created_at, updated_at, deleted_at, metadata)
    VALUES (?, ?, ?, ?, ?, NULL, ?)
  `).run(memoryId, parsed.content.trim(), occurredAt, nowIso, nowIso, JSON.stringify(metadata));

  // 2. Index associated people entities
  for (const person of combinedPeople) {
    const normalized = normalizePersonName(person);
    const personId = randomUUID();

    db.prepare(`
      INSERT INTO people (id, name, normalized_name, first_seen_at, last_seen_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(normalized_name) DO UPDATE SET
        last_seen_at = excluded.last_seen_at
    `).run(personId, person, normalized, occurredAt, occurredAt);

    const actualPerson = db
      .prepare('SELECT id FROM people WHERE normalized_name = ?')
      .get(normalized) as { id: string };

    db.prepare(`
      INSERT OR IGNORE INTO memory_people (memory_id, person_id)
      VALUES (?, ?)
    `).run(memoryId, actualPerson.id);
  }

  // 3. Chunk and embed content
  const chunks = chunkText(parsed.content);
  for (let i = 0; i < chunks.length; i++) {
    const chunkContent = chunks[i];
    const embedding = await generateEmbedding(chunkContent, db);
    const chunkId = randomUUID();

    db.prepare(`
      INSERT INTO memory_chunks (id, memory_id, chunk_index, content, embedding)
      VALUES (?, ?, ?, ?, ?)
    `).run(chunkId, memoryId, i, chunkContent, serializeVector(embedding));
  }

  // 4. Audit Log
  recordAuditLog(db, 'remember', { content: parsed.content, metadata }, memoryId);

  return {
    id: memoryId,
    message: 'Remembered.',
  };
}
