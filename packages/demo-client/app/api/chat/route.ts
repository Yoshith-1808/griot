/**
 * @file packages/demo-client/app/api/chat/route.ts
 * @description Next.js App Router API proxy to the Griot MCP Server.
 */

import { NextResponse } from 'next/server';

const SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3000';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await fetch(`${SERVER_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: `Failed to reach MCP server: ${message}` },
      { status: 502 },
    );
  }
}
