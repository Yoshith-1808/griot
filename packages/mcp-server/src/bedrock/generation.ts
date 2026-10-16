/**
 * @file packages/mcp-server/src/bedrock/generation.ts
 * @description Claude Sonnet generation wrapper for synthesizing natural spoken voice responses.
 * Conditions outputs for voice assistants: concise, zero markdown, and under 30 words.
 */

import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { config } from '../config.js';
import { createScopedLogger } from '../lib/logger.js';
import { executeWithRetry, getBedrockClient, isDemoMode } from './client.js';

const log = createScopedLogger('ClaudeGeneration');

export interface GenerationOptions {
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

const DEFAULT_VOICE_SYSTEM_PROMPT = `
You are the voice response engine for Griot, an episodic memory layer for Alexa+.
Your output will be read aloud directly by Alexa's Text-To-Speech (TTS) synthesizer.
Strict rules:
1. Speak in a natural, warm, and helpful tone.
2. Absolutely NEVER emit markdown formatting, asterisks, bullet points, headers, or brackets.
3. Keep spoken replies under 35 words unless specifically asked for a period summary.
4. Directly answer the user's question using only the verified episodic memories provided.
`.trim();

/**
 * Generates spoken text using Anthropic Claude on AWS Bedrock.
 *
 * @param userPrompt - The context and query prompt.
 * @param options - Generation options (system prompt, temperature, maxTokens).
 * @returns Synthesized natural language string formatted for voice.
 */
export async function generateSpokenText(
  userPrompt: string,
  options: GenerationOptions = {},
): Promise<string> {
  const systemPrompt = options.systemPrompt ?? DEFAULT_VOICE_SYSTEM_PROMPT;
  const maxTokens = options.maxTokens ?? 150;
  const temperature = options.temperature ?? 0.3;

  // Offline Demo Mode synthesis fallback
  if (isDemoMode()) {
    log.debug('Using demo mode conversational synthesis');
    return generateOfflineSpokenFallback(userPrompt);
  }

  log.info({ modelId: config.BEDROCK_MODEL_ID }, 'Invoking Claude Sonnet on AWS Bedrock');
  const client = getBedrockClient();

  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: userPrompt }],
      },
    ],
  };

  const command = new InvokeModelCommand({
    modelId: config.BEDROCK_MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(payload),
  });

  const response = await executeWithRetry(() => client.send(command));
  const rawBody = new TextDecoder().decode(response.body);
  const parsed = JSON.parse(rawBody) as {
    content?: Array<{ type: string; text: string }>;
  };

  const text = parsed.content?.[0]?.text ?? '';
  return cleanForVoice(text);
}

/**
 * Strips all markdown symbols, asterisks, and citations from generated text.
 */
export function cleanForVoice(text: string): string {
  return text
    .replace(/[*_#`~[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Deterministic offline synthesis for local evaluation without AWS keys.
 */
function generateOfflineSpokenFallback(prompt: string): string {
  const lower = prompt.toLowerCase();

  if (lower.includes('allergic') || lower.includes('allergy')) {
    return 'Based on your memories, David mentioned he is severely allergic to shellfish and peanuts. Keep that in mind when planning meals.';
  }

  if (lower.includes('sarah')) {
    return 'Sarah pitched her Series A round and recommended reading Designing Data-Intensive Applications by Martin Kleppmann.';
  }

  if (lower.includes('summarize')) {
    return 'Here is a recap of your recent activity: You recorded key milestones with colleagues, tracked personal gifts, and kept notes on health and travel.';
  }

  if (lower.includes('buy') || lower.includes('coffee')) {
    return 'You ordered two bags of Kenyan AA single-origin coffee beans from Counter Culture.';
  }

  return 'Here is what I found in your memories based on what you asked.';
}
