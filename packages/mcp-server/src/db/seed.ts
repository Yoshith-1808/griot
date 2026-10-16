/**
 * @file packages/mcp-server/src/db/seed.ts
 * @description Populates 30 days of rich, realistic episodic memories for judges.
 * Covers diverse topics: dietary restrictions, book recommendations, birthdays, travel, and meetings.
 */

import type Database from 'better-sqlite3';
import { createScopedLogger } from '../lib/logger.js';
import { handleRemember } from '../tools/remember.js';

const log = createScopedLogger('SeedData');

export const SEED_MEMORIES = [
  {
    content:
      'Had an afternoon espresso with Sarah at Blue Bottle; she just pitched her Series A round and was celebrating.',
    daysAgo: 1,
    people: ['Sarah'],
    tags: ['social', 'work', 'coffee'],
  },
  {
    content:
      'David mentioned he is severely allergic to shellfish and peanuts. Must remember when planning dinners.',
    daysAgo: 2,
    people: ['David'],
    tags: ['health', 'dietary', 'friend'],
  },
  {
    content:
      'Ordered two bags of fresh Kenyan AA single-origin coffee beans from Counter Culture; arriving Saturday morning.',
    daysAgo: 3,
    people: [],
    tags: ['coffee', 'orders'],
  },
  {
    content:
      "Sarah recommended reading 'Designing Data-Intensive Applications' by Martin Kleppmann for our distributed storage redesign.",
    daysAgo: 4,
    people: ['Sarah'],
    tags: ['books', 'architecture', 'reading'],
  },
  {
    content:
      "Maya's birthday is coming up on June 14th; she mentioned she loves handcrafted Japanese ceramic matcha bowls and Mino ware pottery.",
    daysAgo: 5,
    people: ['Maya'],
    tags: ['gifts', 'birthday'],
  },
  {
    content:
      'Finished final code review for the Bedrock streaming inference endpoint with Marcus; latency dropped to 180 milliseconds.',
    daysAgo: 6,
    people: ['Marcus'],
    tags: ['engineering', 'bedrock'],
  },
  {
    content:
      'Dr. Chen reminded me at my annual physical to increase daily hydration to at least 2.5 liters and schedule eye checkup in November.',
    daysAgo: 8,
    people: ['Dr. Chen'],
    tags: ['health', 'doctor'],
  },
  {
    content:
      'Family dinner with Elena in North Beach; she started a new role as product lead at Stripe and loves the team.',
    daysAgo: 10,
    people: ['Elena'],
    tags: ['family', 'dinner'],
  },
  {
    content:
      'Booked flights to Seattle for AWS re:Invent; staying at the Hyatt Olive 8 from November 30 to December 5.',
    daysAgo: 12,
    people: [],
    tags: ['travel', 'aws', 'conference'],
  },
  {
    content:
      'David loved the homemade sourdough loaf I brought him; asked for the baker’s hydration percentage (78%).',
    daysAgo: 14,
    people: ['David'],
    tags: ['baking', 'social'],
  },
  {
    content:
      'Car service appointment completed at Bavarian Motors; brake pads replaced and tires rotated. Next inspection due at 45,000 miles.',
    daysAgo: 16,
    people: [],
    tags: ['car', 'maintenance'],
  },
  {
    content:
      'Maya shared her favorite Kyoto itinerary: Fushimi Inari at sunrise, followed by tea ceremonies in Gion.',
    daysAgo: 18,
    people: ['Maya'],
    tags: ['travel', 'japan'],
  },
  {
    content:
      'Marcus and I brainstormed the offline fallback architecture for Alexa+ VoiceOrb using Web Speech and SpeechSynthesis APIs.',
    daysAgo: 21,
    people: ['Marcus'],
    tags: ['hackathon', 'architecture'],
  },
  {
    content:
      'Sent Sarah a thank-you note and links to the vector embedding benchmark papers we discussed last month.',
    daysAgo: 24,
    people: ['Sarah'],
    tags: ['work', 'networking'],
  },
  {
    content:
      'Elena recommended checking out the new modern art exhibit at SFMOMA before it closes next weekend.',
    daysAgo: 28,
    people: ['Elena'],
    tags: ['art', 'weekend'],
  },
  {
    content: 'Renewed passport expedited at the San Francisco agency; valid through October 2036.',
    daysAgo: 29,
    people: [],
    tags: ['documents', 'travel'],
  },
];

/**
 * Seeds the database with 30 days of realistic memories if not already populated.
 *
 * @param db - SQLite database client.
 * @returns Number of seeded memories.
 */
export async function seedMemoriesIfEmpty(db: Database.Database): Promise<number> {
  const row = db
    .prepare('SELECT COUNT(*) as count FROM memories WHERE deleted_at IS NULL')
    .get() as {
    count: number;
  };

  if (row.count > 0) {
    log.info({ existingCount: row.count }, 'Database already contains memories; skipping seed');
    return row.count;
  }

  log.info('Seeding database with 30 days of realistic demo memories');
  const now = Date.now();

  for (const item of SEED_MEMORIES) {
    const occurredDate = new Date(now - item.daysAgo * 24 * 60 * 60 * 1000).toISOString();
    await handleRemember(
      {
        content: item.content,
        tags: item.tags,
        people: item.people,
        occurred_at: occurredDate,
      },
      db,
    );
  }

  log.info({ seededCount: SEED_MEMORIES.length }, 'Successfully seeded demo memories');
  return SEED_MEMORIES.length;
}
