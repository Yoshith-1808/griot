/**
 * @file packages/mcp-server/src/lib/vector.ts
 * @description Vector mathematical helpers and SQLite BLOB serialization.
 * Implements high-throughput cosine distance calculation and recency reranking.
 */

/**
 * Serializes a number array of 32-bit floats into a raw Node.js Buffer BLOB.
 *
 * @param vector - Array of float values.
 * @returns Node.js Buffer representing IEEE 754 float32 bytes.
 */
export function serializeVector(vector: number[]): Buffer {
  const floatArray = new Float32Array(vector);
  return Buffer.from(floatArray.buffer, floatArray.byteOffset, floatArray.byteLength);
}

/**
 * Deserializes a raw SQLite BLOB into a Float32Array.
 *
 * @param blob - Node.js Buffer from SQLite.
 * @returns Float32Array of vector components.
 */
export function deserializeVector(blob: Buffer): Float32Array {
  const byteOffset = blob.byteOffset;
  const length = blob.byteLength / Float32Array.BYTES_PER_ELEMENT;
  return new Float32Array(blob.buffer.slice(byteOffset, byteOffset + blob.byteLength), 0, length);
}

/**
 * Computes the cosine similarity between two float vectors.
 * Assumes vectors are already unit-normalized (standard for Titan v2 embeddings).
 *
 * @param a - First vector.
 * @param b - Second vector.
 * @returns Cosine similarity score in range [-1.0, 1.0].
 */
export function cosineSimilarity(a: Float32Array | number[], b: Float32Array | number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  const len = a.length;

  for (let i = 0; i < len; i++) {
    const valA = a[i];
    const valB = b[i];
    dotProduct += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

/**
 * Computes a recency-weighted relevance score.
 * Formula: score = (1 - alpha) * cosine_sim + alpha * exp(-lambda * delta_days)
 *
 * @param similarity - Raw cosine similarity [0..1].
 * @param occurredAtIso - ISO timestamp of when the event happened.
 * @param halfLifeDays - Half life in days for exponential decay (default 30 days).
 * @param alpha - Weight assigned to recency (default 0.15).
 * @returns Combined score balancing semantic relevance and temporal recency.
 */
export function calculateRerankedScore(
  similarity: number,
  occurredAtIso: string,
  halfLifeDays = 30,
  alpha = 0.15,
): number {
  const now = Date.now();
  const eventTime = new Date(occurredAtIso).getTime();
  const diffDays = Math.max(0, (now - eventTime) / (1000 * 60 * 60 * 24));

  const lambda = Math.LN2 / halfLifeDays;
  const recencyDecay = Math.exp(-lambda * diffDays);

  return (1 - alpha) * similarity + alpha * recencyDecay;
}
