/**
 * @file packages/mcp-server/src/server.ts
 * @description Model Context Protocol (MCP) Server setup and JSON-RPC 2.0 router.
 * Conforms to spec 2025-11-25 with Streamable HTTP and SSE transport support.
 */

import type Database from 'better-sqlite3';
import type { Request, Response } from 'express';
import { createScopedLogger } from './lib/logger.js';
import { ALL_MCP_TOOLS, executeToolByName } from './tools/register-all.js';

const log = createScopedLogger('McpRouter');

export interface McpJsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: {
    name?: string;
    arguments?: Record<string, unknown>;
  };
}

/**
 * Handles incoming Streamable HTTP JSON-RPC 2.0 requests at `POST /mcp`.
 *
 * @param req - Express Request.
 * @param res - Express Response.
 * @param db - SQLite Database client.
 */
export async function handleStreamableHttpMcp(
  req: Request,
  res: Response,
  db: Database.Database,
): Promise<void> {
  const body = req.body as McpJsonRpcRequest;
  const id = body?.id ?? null;
  const method = body?.method;

  log.info({ method, id }, 'Incoming MCP Streamable HTTP request');

  try {
    if (!method) {
      res.status(400).json({
        jsonrpc: '2.0',
        id,
        error: { code: -32600, message: 'Invalid Request: Missing JSON-RPC method' },
      });
      return;
    }

    // 1. MCP initialize handshake
    if (method === 'initialize') {
      res.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2025-11-25',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'griot',
            version: '0.1.0',
          },
        },
      });
      return;
    }

    // 2. Ping
    if (method === 'ping') {
      res.json({ jsonrpc: '2.0', id, result: {} });
      return;
    }

    // 3. List tools
    if (method === 'tools/list') {
      res.json({
        jsonrpc: '2.0',
        id,
        result: {
          tools: ALL_MCP_TOOLS,
        },
      });
      return;
    }

    // 4. Call tool
    if (method === 'tools/call') {
      const toolName = body.params?.name;
      const toolArgs = body.params?.arguments ?? {};

      if (!toolName) {
        res.status(400).json({
          jsonrpc: '2.0',
          id,
          error: { code: -32602, message: 'Missing tool name in params' },
        });
        return;
      }

      const output = await executeToolByName(toolName, toolArgs, db);

      res.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: typeof output === 'string' ? output : JSON.stringify(output, null, 2),
            },
          ],
          structured: output,
          isError: false,
        },
      });
      return;
    }

    // Unknown method
    res.status(404).json({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method '${method}' not found` },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    log.error({ err, method }, 'Error handling MCP request');

    res.status(500).json({
      jsonrpc: '2.0',
      id,
      error: { code: -32000, message: errorMsg },
    });
  }
}
