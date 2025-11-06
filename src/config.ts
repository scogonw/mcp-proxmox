/**
 * Configuration management with validation
 * Loads and validates environment variables with sensible defaults
 */

import { z } from 'zod';
import dotenv from 'dotenv';
import { ProxmoxConfig } from './types.js';
import { ConfigurationError } from './errors.js';
import { existsSync } from 'fs';
import { resolve, join } from 'path';

/**
 * Configuration schema with Zod validation
 */
const configSchema = z.object({
  host: z.string().min(1, 'PROXMOX_HOST is required'),
  port: z.coerce.number().int().positive().default(8006),
  user: z.string().min(1, 'PROXMOX_USER is required'),
  tokenName: z.string().min(1, 'PROXMOX_TOKEN_NAME is required'),
  tokenValue: z.string().min(1, 'PROXMOX_TOKEN_VALUE is required'),
  allowElevated: z.coerce.boolean().default(false),
  timeout: z.coerce.number().positive().default(30000),
  retryAttempts: z.coerce.number().int().min(0).max(5).default(3),
  retryDelay: z.coerce.number().positive().default(1000),
});

/**
 * Find and load .env file from current directory or parent directories
 */
function loadEnvFile(): void {
  let currentDir = process.cwd();
  const maxLevels = 5; // Don't search more than 5 levels up

  for (let i = 0; i < maxLevels; i++) {
    const envPath = join(currentDir, '.env');

    if (existsSync(envPath)) {
      dotenv.config({ path: envPath });
      console.error(`Loaded environment from: ${envPath}`);
      return;
    }

    const parentDir = resolve(currentDir, '..');
    if (parentDir === currentDir) {
      // Reached root directory
      break;
    }
    currentDir = parentDir;
  }

  console.error('Warning: No .env file found in current or parent directories');
}

/**
 * Load and validate configuration from environment variables
 */
export function loadConfig(): ProxmoxConfig {
  // Load .env file if it exists
  loadEnvFile();

  try {
    const rawConfig = {
      host: process.env.PROXMOX_HOST,
      port: process.env.PROXMOX_PORT,
      user: process.env.PROXMOX_USER,
      tokenName: process.env.PROXMOX_TOKEN_NAME,
      tokenValue: process.env.PROXMOX_TOKEN_VALUE,
      allowElevated: process.env.PROXMOX_ALLOW_ELEVATED,
      timeout: process.env.PROXMOX_TIMEOUT,
      retryAttempts: process.env.PROXMOX_RETRY_ATTEMPTS,
      retryDelay: process.env.PROXMOX_RETRY_DELAY,
    };

    const config = configSchema.parse(rawConfig);

    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map((issue) => `  • ${issue.path.join('.')}: ${issue.message}`)
        .join('\n');

      throw new ConfigurationError(
        `Configuration validation failed:\n${issues}\n\nPlease check your .env file or environment variables.`,
        { zodError: error.issues }
      );
    }

    throw error;
  }
}

/**
 * Get configuration with caching
 */
let cachedConfig: ProxmoxConfig | null = null;

export function getConfig(): ProxmoxConfig {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}

/**
 * Reset cached configuration (useful for testing)
 */
export function resetConfig(): void {
  cachedConfig = null;
}

/**
 * Validate configuration without throwing
 */
export function validateConfig(): { valid: boolean; errors?: string[] } {
  try {
    loadConfig();
    return { valid: true };
  } catch (error) {
    if (error instanceof ConfigurationError) {
      return {
        valid: false,
        errors: [error.message],
      };
    }
    return {
      valid: false,
      errors: ['Unknown configuration error'],
    };
  }
}
