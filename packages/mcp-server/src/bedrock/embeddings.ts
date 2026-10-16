/**
 * @file packages/mcp-server/src/bedrock/embeddings.ts
 * @description Amazon Titan Embeddings v2 client with SQLite deduplication caching.
 * Generates 1024-dimensional unit-normalized semantic vectors.
 */

import { createHash } from 'node:crypto';
import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import type Database from 'better-sqlite3';
import { config } from '../config.js';
import { createScopedLogger } from '../lib/logger.js';
import { deserializeVector, serializeVector } from '../lib/vector.js';
import { executeWithRetry, getBedrockClient, isDemoMode } from './client.js';

const log = createScopedLogger('Embeddings');

/**
 * Computes a SHA-256 hex digest of the normalized input text.
 */
function hashContent(text: string): string {
  return createHash('sha256').update(text.trim().toLowerCase()).digest('hex');
}

/**
 * Deterministic offline vector generator for local demo mode.
 * Projects subword token frequencies into a 1024-dimensional unit sphere.
 */
function generateDemoEmbedding(text: string, dimensions = 1024): number[] {
  const vec = new Float32Array(dimensions);
  const normalized = text.toLowerCase().trim();

  for (let i = 0; i < normalized.length - 2; i++) {
    const gram = normalized.slice(i, i + 3);
    let hash = 0;
    for (let j = 0; j < gram.length; j++) {
      hash = (hash << 5) - hash + gram.charCodeAt(j);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dimensions;
    vec[idx] += 1.0;
  }

  // Unit normalize
  let norm = 0;
  for (let i = 0; i < dimensions; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) vec[i] /= norm;
  } else {
    vec[0] = 1.0;
  }

  return Array.from(vec);
}

/**
 * Generates or retrieves from cache a 1024-dimensional Titan v2 embedding vector.
 *
 * @param text - The text string to embed.
 * @param db - SQLite database for reading/writing cached vectors.
 * @returns Array of 1024 float numbers representing the embedding.
 */
export async function generateEmbedding(text: string, db: Database.Database): Promise<number[]> {
  const contentHash = hashContent(text);

  // 1. Check local SQLite cache
  const cached = db
    .prepare('SELECT embedding FROM embeddings_cache WHERE content_hash = ?')
    .get(contentHash) as { embedding: Buffer } | undefined;

  if (cached?.embedding) {
    return Array.from(deserializeVector(cached.embedding));
  }

  // 2. Offline Demo Mode fallback
  if (isDemoMode()) {
    log.debug({ textLength: text.length }, 'Generating deterministic demo embedding');
    const embedding = generateDemoEmbedding(text, 1024);
    db.prepare(`
      INSERT OR REPLACE INTO embeddings_cache (content_hash, embedding, model_id, created_at)
      VALUES (?, ?, ?, ?)
    `).run(contentHash, serializeVector(embedding), 'demo-subword-v1', new Date().toISOString());
    return embedding;
  }

  // 3. AWS Bedrock Titan Embeddings v2 API Call
  log.info({ modelId: config.BEDROCK_EMBEDDING_MODEL_ID }, 'Requesting Bedrock Titan embedding');
  const client = getBedrockClient();

  const payload = {
    inputText: text,
    dimensions: 1024,
    normalize: true,
  };

  const command = new InvokeModelCommand({
    modelId: config.BEDROCK_EMBEDDING_MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(payload),
  });

  const response = await executeWithRetry(() => client.send(command));
  const rawBody = new TextDecoder().decode(response.body);
  const parsed = JSON.parse(rawBody) as { embedding: number[] };
  const embedding = parsed.embedding;

  // 4. Cache in SQLite
  db.prepare(`
    INSERT OR REPLACE INTO embeddings_cache (content_hash, embedding, model_id, created_at)
    VALUES (?, ?, ?, ?)
  `).run(
    contentHash,
    serializeVector(embedding),
    config.BEDROCK_EMBEDDING_MODEL_ID,
    new Date().toISOString(),
  );

  return embedding;
}
