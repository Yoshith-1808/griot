/**
 * @file packages/mcp-server/src/lib/logger.ts
 * @description Structured Pino logger for Griot.
 * Complies with the non-negotiable zero-console.log policy.
 */

import pino from 'pino';
import { config } from '../config.js';

export const logger = pino({
  level: config.LOG_LEVEL,
  formatters: {
    level: (label: string) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Creates a child logger with an attached module tag.
 *
 * @param moduleName - The name of the module or service.
 * @returns A scoped Pino child logger instance.
 */
export function createScopedLogger(moduleName: string) {
  return logger.child({ module: moduleName });
}
