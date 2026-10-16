/**
 * @file packages/mcp-server/src/index.ts
 * @description Main HTTP entrypoint for the Griot MCP Server.
 * Exposes Streamable HTTP, SSE, Health Check, and helper APIs for the Voice UI client.
 */

import cors from 'cors';
import express, { type Request, type Response } from 'express';
import { isDemoMode } from './bedrock/client.js';
import { config } from './config.js';
import { closeDatabase, getDatabase } from './db/client.js';
import { seedMemoriesIfEmpty } from './db/seed.js';
import { createScopedLogger } from './lib/logger.js';
import { handleStreamableHttpMcp } from './server.js';
import { handleKnowAbout } from './tools/know-about.js';
import { handleRecall } from './tools/recall.js';
import { ALL_MCP_TOOLS, executeToolByName } from './tools/register-all.js';
import { handleRemember } from './tools/remember.js';
import { handleSummarizePeriod } from './tools/summarize-period.js';

const log = createScopedLogger('Server');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// Initialize SQLite database
const db = getDatabase();

// -----------------------------------------------------------------------------
// MCP Core Protocol Endpoints
// -----------------------------------------------------------------------------

/**
 * Streamable HTTP endpoint for Model Context Protocol JSON-RPC requests.
 */
app.post('/mcp', (req: Request, res: Response) => {
  handleStreamableHttpMcp(req, res, db);
});

/**
 * Server-Sent Events (SSE) streaming notifications endpoint.
 */
app.get('/sse', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  res.write(
    `data: ${JSON.stringify({ event: 'connected', server: 'griot', version: '0.1.0' })}\n\n`,
  );

  const keepAlive = setInterval(() => {
    res.write(': ping\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAlive);
    res.end();
  });
});

/**
 * Root browser redirection to Voice Client UI.
 */
app.get('/', (req: Request, res: Response) => {
  if (req.accepts('html')) {
    res.redirect(`http://localhost:${config.DEMO_CLIENT_PORT}`);
    return;
  }
  res.json({
    server: 'Griot MCP Server',
    version: '0.1.0',
    description: 'Conversational Episodic Memory Layer for Alexa+',
    voiceClientUrl: `http://localhost:${config.DEMO_CLIENT_PORT}`,
    mcpEndpoint: `http://localhost:${config.MCP_PORT}/mcp`,
    health: `http://localhost:${config.MCP_PORT}/health`,
  });
});

/**
 * Comprehensive health check endpoint.
 */
app.get('/health', (_req: Request, res: Response) => {
  const memoryCount = (
    db.prepare('SELECT COUNT(*) as count FROM memories WHERE deleted_at IS NULL').get() as {
      count: number;
    }
  ).count;

  res.json({
    status: 'healthy',
    server: 'griot',
    version: '0.1.0',
    demoMode: isDemoMode(),
    models: {
      generation: config.BEDROCK_MODEL_ID,
      embedding: config.BEDROCK_EMBEDDING_MODEL_ID,
    },
    database: {
      type: 'sqlite',
      activeMemories: memoryCount,
    },
    toolsAvailable: ALL_MCP_TOOLS.map((t) => t.name),
  });
});

// -----------------------------------------------------------------------------
// Voice UI & Developer REST Helper Endpoints
// -----------------------------------------------------------------------------

/**
 * Direct REST invocation for individual MCP tools.
 */
app.post('/api/tools/:name', async (req: Request, res: Response) => {
  const toolName = req.params.name as string;
  try {
    const result = await executeToolByName(toolName, req.body, db);
    res.json({ success: true, tool: toolName, result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log.error({ err, toolName }, 'Error executing tool via REST');
    res.status(400).json({ success: false, error: message });
  }
});

/**
 * Retrieves all active episodic memories ordered by date.
 */
app.get('/api/memories', (_req: Request, res: Response) => {
  const memories = db
    .prepare(`
      SELECT id, content, occurred_at, created_at, metadata
      FROM memories
      WHERE deleted_at IS NULL
      ORDER BY occurred_at DESC
    `)
    .all();

  res.json({ memories });
});

/**
 * Retrieves all known people entities and their memory counts.
 */
app.get('/api/people', (_req: Request, res: Response) => {
  const people = db
    .prepare(`
      SELECT
        p.id,
        p.name,
        p.first_seen_at,
        p.last_seen_at,
        COUNT(mp.memory_id) as memory_count
      FROM people p
      LEFT JOIN memory_people mp ON p.id = mp.person_id
      LEFT JOIN memories m ON mp.memory_id = m.id AND m.deleted_at IS NULL
      GROUP BY p.id
      ORDER BY memory_count DESC, p.last_seen_at DESC
    `)
    .all();

  res.json({ people });
});

/**
 * Seeds the database with 30 days of realistic demo memories.
 */
app.post('/api/seed', async (_req: Request, res: Response) => {
  try {
    const count = await seedMemoriesIfEmpty(db);
    res.json({ success: true, message: `Seeded ${count} memories into database.` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * Conversational Voice Router for the simulated Alexa+ client.
 * Decides whether an utterance is a storage (remember), retrieval (recall),
 * person lookup (know_about), or summary (summarize_period).
 */
app.post('/api/chat', async (req: Request, res: Response) => {
  const transcript: string = (req.body?.transcript || '').trim();
  log.info({ transcript }, 'Processing voice utterance in router');

  if (!transcript) {
    res.status(400).json({ success: false, error: 'Empty transcript' });
    return;
  }

  const lower = transcript.toLowerCase();

  try {
    // 1. Remember intent
    if (
      lower.startsWith('remember ') ||
      lower.startsWith('remember that ') ||
      lower.startsWith('note that ') ||
      lower.startsWith("don't forget that ") ||
      lower.startsWith('keep in mind that ')
    ) {
      const content = transcript.replace(
        /^(remember that|remember|note that|don't forget that|keep in mind that)\s+/i,
        '',
      );
      const result = await handleRemember({ content }, db);
      res.json({
        success: true,
        toolUsed: 'remember',
        spoken: 'Remembered.',
        data: result,
      });
      return;
    }

    // 2. Know About intent
    if (
      lower.startsWith('what do you know about ') ||
      lower.startsWith('tell me about ') ||
      lower.startsWith('who is ')
    ) {
      const person = transcript
        .replace(/^(what do you know about|tell me about|who is)\s+/i, '')
        .replace(/[?.]/g, '')
        .trim();

      const result = await handleKnowAbout({ person }, db);
      res.json({
        success: true,
        toolUsed: 'know_about',
        spoken: result.summary,
        data: result,
      });
      return;
    }

    // 3. Summarize Period intent
    if (
      lower.includes('summarize') ||
      lower.includes('recap my week') ||
      lower.includes('what happened this week') ||
      lower.includes('what did i do this month')
    ) {
      const period = lower.includes('month')
        ? 'month'
        : lower.includes('day') || lower.includes('today')
          ? 'day'
          : 'week';
      const result = await handleSummarizePeriod({ period }, db);
      res.json({
        success: true,
        toolUsed: 'summarize_period',
        spoken: result.summary,
        data: result,
      });
      return;
    }

    // 4. Default: Semantic Recall intent
    const result = await handleRecall({ query: transcript, limit: 3 }, db);
    res.json({
      success: true,
      toolUsed: 'recall',
      spoken: result.spoken,
      data: result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log.error({ err, transcript }, 'Error processing conversational voice chat');
    res.status(500).json({ success: false, error: message });
  }
});

// -----------------------------------------------------------------------------
// Server Initialization
// -----------------------------------------------------------------------------

const server = app.listen(config.MCP_PORT, config.HOST, async () => {
  log.info(`🚀 Griot MCP Server listening on http://${config.HOST}:${config.MCP_PORT}`);
  log.info(`📡 Streamable HTTP endpoint mounted at http://${config.HOST}:${config.MCP_PORT}/mcp`);

  // Seed sample memories if empty so judges have immediate data
  try {
    await seedMemoriesIfEmpty(db);
  } catch (err) {
    log.error({ err }, 'Failed initial memory seed');
  }
});

// Graceful shutdown
function shutdown() {
  log.info('Shutting down Griot MCP Server gracefully...');
  server.close(() => {
    closeDatabase();
    log.info('Server and database closed. Goodbye.');
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
