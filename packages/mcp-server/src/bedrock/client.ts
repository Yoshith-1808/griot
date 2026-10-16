/**
 * @file packages/mcp-server/src/bedrock/client.ts
 * @description AWS Bedrock Runtime Client wrapper with resilience and throttling recovery.
 * Uses exponential-backoff with full jitter and transparent demo-mode fallback.
 */

import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { backOff } from 'exponential-backoff';
import { config } from '../config.js';
import { createScopedLogger } from '../lib/logger.js';

const log = createScopedLogger('BedrockClient');

let bedrockClientInstance: BedrockRuntimeClient | null = null;

/**
 * Checks whether the application is running in local Demo Mode.
 *
 * @returns True if DEMO_MODE=true or AWS credentials are not configured.
 */
export function isDemoMode(): boolean {
  if (config.DEMO_MODE) return true;
  return !config.AWS_ACCESS_KEY_ID || !config.AWS_SECRET_ACCESS_KEY;
}

/**
 * Gets or initializes the singleton BedrockRuntimeClient.
 *
 * @returns {@link BedrockRuntimeClient} configured with region and credentials.
 */
export function getBedrockClient(): BedrockRuntimeClient {
  if (!bedrockClientInstance) {
    if (isDemoMode()) {
      log.info('Running in DEMO MODE (AWS Bedrock credentials not provided or DEMO_MODE=true)');
    }

    bedrockClientInstance = new BedrockRuntimeClient({
      region: config.AWS_REGION,
      credentials:
        config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: config.AWS_ACCESS_KEY_ID,
              secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }

  return bedrockClientInstance;
}

/**
 * Executes an asynchronous Bedrock API call with exponential backoff on rate-limit errors.
 *
 * @param operation - Function executing the Bedrock command.
 * @returns The resolved result of the operation.
 */
export async function executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
  return backOff(operation, {
    numOfAttempts: 5,
    startingDelay: 500,
    timeMultiple: 2,
    jitter: 'full',
    retry: (error: unknown, attemptNumber: number) => {
      const err = error as {
        name?: string;
        message?: string;
        $metadata?: { httpStatusCode?: number };
      };
      const isThrottled =
        err?.name === 'ThrottlingException' ||
        err?.name === 'ModelNotReadyException' ||
        err?.$metadata?.httpStatusCode === 429;

      log.warn(
        { attemptNumber, errorName: err?.name, isThrottled },
        'Bedrock API call failed; assessing retry condition',
      );

      return isThrottled;
    },
  });
}
