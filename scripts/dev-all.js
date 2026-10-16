/**
 * @file scripts/dev-all.js
 * @description Monorepo launcher for Griot.
 * Spawns the MCP Server on Port 3000 and the Next.js Voice Client on Port 5173 concurrently.
 */

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const isWindows = process.platform === 'win32';
const pnpmCmd = isWindows ? 'pnpm.cmd' : 'pnpm';

console.log('🚀 Starting Griot Monorepo (MCP Server on 3000, Voice Client on 5173)...');

const server = spawn(pnpmCmd, ['--filter', '@griot/mcp-server', 'dev'], {
  stdio: 'inherit',
  shell: true,
  cwd: resolve(process.cwd()),
});

const client = spawn(pnpmCmd, ['--filter', '@griot/demo-client', 'dev'], {
  stdio: 'inherit',
  shell: true,
  cwd: resolve(process.cwd()),
});

function cleanup() {
  console.log('\n🛑 Stopping Griot processes...');
  server.kill('SIGINT');
  client.kill('SIGINT');
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
