/**
 * @file packages/mcp-server/src/tools/register-all.ts
 * @description Registers all 5 core MCP tools plus 1 bonus reflection tool.
 * Provides unified schema registry and execution router.
 */

import type Database from 'better-sqlite3';
import { forgetToolDefinition, handleForget } from './forget.js';
import { handleKnowAbout, knowAboutToolDefinition } from './know-about.js';
import { handleRecall, recallToolDefinition } from './recall.js';
import { handleReflect, reflectToolDefinition } from './reflect.js';
import { handleRemember, rememberToolDefinition } from './remember.js';
import { handleSummarizePeriod, summarizePeriodToolDefinition } from './summarize-period.js';

export const ALL_MCP_TOOLS = [
  rememberToolDefinition,
  recallToolDefinition,
  knowAboutToolDefinition,
  summarizePeriodToolDefinition,
  forgetToolDefinition,
  reflectToolDefinition,
];

/**
 * Dispatches an MCP tool call by name.
 *
 * @param name - Name of the MCP tool to execute.
 * @param args - Arguments payload for the tool.
 * @param db - SQLite database client.
 * @returns Structured tool output.
 * @throws Error if tool name is unrecognized.
 */
export async function executeToolByName(
  name: string,
  args: unknown,
  db: Database.Database,
): Promise<unknown> {
  switch (name) {
    case 'remember':
      return await handleRemember(args, db);
    case 'recall':
      return await handleRecall(args, db);
    case 'know_about':
      return await handleKnowAbout(args, db);
    case 'summarize_period':
      return await handleSummarizePeriod(args, db);
    case 'forget':
      return await handleForget(args, db);
    case 'reflect':
      return await handleReflect(args, db);
    default:
      throw new Error(`Unrecognized MCP tool: '${name}'`);
  }
}
