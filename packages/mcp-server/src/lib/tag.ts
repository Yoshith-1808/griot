/**
 * @file packages/mcp-server/src/lib/tag.ts
 * @description Entity and tag extraction from spoken voice text.
 * Identifies proper person names, honorifics, and contextual categories.
 */

const COMMON_RELATIONS = [
  'Mom',
  'Dad',
  'Mother',
  'Father',
  'Sister',
  'Brother',
  'Grandma',
  'Grandpa',
  'Aunt',
  'Uncle',
  'Cousin',
];

const STOP_WORDS = new Set([
  'I',
  'We',
  'They',
  'He',
  'She',
  'It',
  'You',
  'The',
  'A',
  'An',
  'And',
  'Or',
  'But',
  'Today',
  'Yesterday',
  'Tomorrow',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
  'Alexa',
  'Griot',
  'Remember',
  'Recall',
  'Please',
  'Note',
  'Hello',
  'Hi',
]);

/**
 * Extracts candidate person names from text.
 * Uses capitalized word sequences and known kinship titles.
 *
 * @param text - The natural language memory content.
 * @returns Array of unique extracted person names.
 */
export function extractPeople(text: string): string[] {
  const people = new Set<string>();

  // 1. Match honorifics like Dr. Smith, Mr. Davis
  const titleRegex = /\b(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)\s+([A-Z][a-z]+)/g;
  let match: RegExpExecArray | null = null;
  while (true) {
    match = titleRegex.exec(text);
    if (!match) break;
    people.add(`${match[1]} ${match[2]}`);
  }

  // 2. Match family relations
  for (const relation of COMMON_RELATIONS) {
    const relRegex = new RegExp(`\\b${relation}\\b`, 'i');
    if (relRegex.test(text)) {
      people.add(relation);
    }
  }

  // 3. Match capitalized proper nouns (excluding sentence start if stopword)
  const capitalizedRegex = /\b([A-Z][a-z]{2,})\b/g;
  while (true) {
    match = capitalizedRegex.exec(text);
    if (!match) break;
    const word = match[1];
    if (!STOP_WORDS.has(word) && !COMMON_RELATIONS.includes(word)) {
      people.add(word);
    }
  }

  return Array.from(people);
}

/**
 * Normalizes a person entity string for canonical indexing and lookup.
 *
 * @param name - Raw extracted name (e.g., "Sarah", "Dr. Smith").
 * @returns Lowercase trimmed identifier (e.g., "sarah", "dr. smith").
 */
export function normalizePersonName(name: string): string {
  return name.trim().toLowerCase();
}
