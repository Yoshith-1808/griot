/**
 * @file packages/shared/src/types.ts
 * @description Core shared type definitions and interfaces for Griot.
 * Defines models for memory records, audit trails, and MCP tool request/response structures.
 */

/**
 * Metadata associated with an episodic memory.
 */
export interface MemoryMetadata {
  tags?: string[];
  people?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  source?: string;
  confidence?: number;
}

/**
 * Representation of an individual episodic memory stored in SQLite.
 */
export interface MemoryItem {
  id: string;
  content: string;
  occurred_at: string;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
  metadata: MemoryMetadata;
}

/**
 * Individual chunk of memory text stored with its embedding vector.
 */
export interface MemoryChunk {
  id: string;
  memory_id: string;
  chunk_index: number;
  content: string;
  embedding: number[];
}

/**
 * Audit log entry for tracking memory operations (remember, recall, forget).
 */
export interface AuditLogEntry {
  id: string;
  action: 'remember' | 'recall' | 'know_about' | 'summarize_period' | 'forget' | 'reflect';
  memory_id?: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

/**
 * Input parameters for the `remember` MCP tool.
 */
export interface RememberInput {
  content: string;
  tags?: string[];
  people?: string[];
  occurred_at?: string;
}

/**
 * Output of the `remember` MCP tool.
 */
export interface RememberOutput {
  id: string;
  message: string;
}

/**
 * Input parameters for the `recall` MCP tool.
 */
export interface RecallInput {
  query: string;
  limit?: number;
  person?: string;
  since?: string;
}

/**
 * Single ranked result item from semantic memory search.
 */
export interface RecallResultItem {
  content: string;
  occurred_at: string;
  relevance: number;
}

/**
 * Output of the `recall` MCP tool.
 */
export interface RecallOutput {
  results: RecallResultItem[];
  spoken: string;
}

/**
 * Input parameters for the `know_about` MCP tool.
 */
export interface KnowAboutInput {
  person: string;
}

/**
 * Output of the `know_about` MCP tool.
 */
export interface KnowAboutOutput {
  person: string;
  summary: string;
  facts: string[];
  last_mentioned: string;
}

/**
 * Input parameters for the `summarize_period` MCP tool.
 */
export interface SummarizePeriodInput {
  period: 'day' | 'week' | 'month';
  anchor_date?: string;
}

/**
 * Output of the `summarize_period` MCP tool.
 */
export interface SummarizePeriodOutput {
  period: 'day' | 'week' | 'month';
  summary: string;
  memory_count: number;
}

/**
 * Input parameters for the `forget` MCP tool.
 */
export interface ForgetInput {
  query?: string;
  person?: string;
  all?: boolean;
}

/**
 * Output of the `forget` MCP tool.
 */
export interface ForgetOutput {
  deleted_count: number;
  message: string;
}

/**
 * Input parameters for the `reflect` MCP tool.
 */
export interface ReflectInput {
  date?: string;
}

/**
 * Output of the `reflect` MCP tool.
 */
export interface ReflectOutput {
  date: string;
  reflection: string;
  highlights: string[];
  questions: string[];
}

/**
 * Live voice orb state indicator.
 */
export type VoiceOrbState = 'idle' | 'listening' | 'processing' | 'speaking';

/**
 * Structure of messages exchanged in the simulated voice interface.
 */
export interface ChatDialogMessage {
  id: string;
  sender: 'user' | 'alexa';
  text: string;
  timestamp: string;
  toolUsed?: string;
  toolData?: Record<string, unknown>;
}
