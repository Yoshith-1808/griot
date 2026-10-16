/**
 * @file packages/mcp-server/src/lib/chunk.ts
 * @description Text chunking algorithm with word boundary preservation and overlap.
 * Ensures long spoken voice narratives are divided into optimal vector embedding windows.
 */

export interface ChunkOptions {
  maxWords?: number;
  overlapWords?: number;
}

/**
 * Splits input text into overlapping chunks suitable for embedding models.
 *
 * @param text - Full narrative string.
 * @param options - maxWords (default 120), overlapWords (default 20).
 * @returns Array of text chunks.
 */
export function chunkText(text: string, options: ChunkOptions = {}): string[] {
  const maxWords = options.maxWords ?? 120;
  const overlapWords = options.overlapWords ?? 20;

  const words = text.trim().split(/\s+/).filter(Boolean);

  if (words.length <= maxWords) {
    return [text.trim()];
  }

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < words.length) {
    const endIndex = Math.min(startIndex + maxWords, words.length);
    const chunkWords = words.slice(startIndex, endIndex);
    chunks.push(chunkWords.join(' '));

    if (endIndex >= words.length) {
      break;
    }

    startIndex += maxWords - overlapWords;
  }

  return chunks;
}
