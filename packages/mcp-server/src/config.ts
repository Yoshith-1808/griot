/**
 * @file packages/mcp-server/src/config.ts
 * @description Zod-validated environment configuration for the Griot MCP Server.
 * Ensures all required environment variables are parsed with safe production defaults.
 */

import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env if present
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  MCP_PORT: z.coerce.number().default(3000),
  DEMO_CLIENT_PORT: z.coerce.number().default(5173),
  DATABASE_PATH: z.string().default('./data/griot.sqlite'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DEMO_MODE: z
    .preprocess((val) => val === 'true' || val === true || val === '1', z.boolean())
    .default(true),

  // AWS Bedrock Configuration
  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  // Foundation Models
  BEDROCK_MODEL_ID: z.string().default('anthropic.claude-sonnet-4-5-20250929-v1:0'),
  BEDROCK_EMBEDDING_MODEL_ID: z.string().default('amazon.titan-embed-text-v2:0'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;

// Ensure database directory exists
const dbFullPath = resolve(process.cwd(), config.DATABASE_PATH);
const dbDir = dirname(dbFullPath);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

export const resolvedDatabasePath = dbFullPath;
