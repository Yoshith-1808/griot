/**
 * @file packages/demo-client/lib/mcp-client.ts
 * @description Client-side bridge for communicating with the Griot MCP Server.
 * Supports direct Streamable HTTP tool calls, memory timeline fetching, and voice processing.
 */

import type { MemoryItem } from '@griot/shared';

const SERVER_URL = process.env.NEXT_PUBLIC_MCP_SERVER_URL || 'http://localhost:3000';

export interface ChatApiResponse {
  success: boolean;
  toolUsed: string;
  spoken: string;
  data: Record<string, unknown>;
  error?: string;
}

export interface PersonItem {
  id: string;
  name: string;
  first_seen_at: string;
  last_seen_at: string;
  memory_count: number;
}

/**
 * Sends a raw MCP tool call over Streamable HTTP (`POST /mcp`).
 *
 * @param name - Name of the MCP tool.
 * @param args - Arguments payload for the tool.
 * @returns Parsed JSON-RPC result.
 */
export async function callMcpTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const response = await fetch(`${SERVER_URL}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name,
        arguments: args,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`MCP tool call failed with status: ${response.status}`);
  }

  const json = await response.json();
  if (json.error) {
    throw new Error(json.error.message || 'MCP Error');
  }

  return json.result?.structured ?? json.result;
}

/**
 * Sends a spoken voice transcript to the Griot voice router.
 *
 * @param transcript - The user's spoken utterance.
 * @returns Structured {@link ChatApiResponse} with toolUsed and spoken text.
 */
export async function sendVoiceTranscript(transcript: string): Promise<ChatApiResponse> {
  const response = await fetch(`${SERVER_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript }),
  });

  if (!response.ok) {
    throw new Error(`Voice processing failed with status: ${response.status}`);
  }

  return await response.json();
}

/**
 * Fetches all active memories from the server.
 */
export async function getMemories(): Promise<MemoryItem[]> {
  const response = await fetch(`${SERVER_URL}/api/memories`);
  if (!response.ok) return [];
  const json = await response.json();
  return (json.memories || []).map((m: Record<string, unknown>) => ({
    ...m,
    metadata: typeof m.metadata === 'string' ? JSON.parse(m.metadata) : m.metadata || {},
  }));
}

/**
 * Fetches all tracked people profiles.
 */
export async function getPeople(): Promise<PersonItem[]> {
  const response = await fetch(`${SERVER_URL}/api/people`);
  if (!response.ok) return [];
  const json = await response.json();
  return json.people || [];
}

/**
 * Triggers the 30-day realistic memory seeding endpoint.
 */
export async function seedDemoMemories(): Promise<string> {
  const response = await fetch(`${SERVER_URL}/api/seed`, { method: 'POST' });
  const json = await response.json();
  return json.message || 'Seeded';
}
