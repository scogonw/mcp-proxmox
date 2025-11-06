#!/usr/bin/env node

/**
 * Proxmox MCP Server - Entry Point
 * Production-grade MCP server for Proxmox VE management
 *
 * @version 2.0.0
 * @author Proxmox MCP Team
 * @license MIT
 */

import { createServer } from './server.js';
import { defaultLogger } from './logger.js';
import { ConfigurationError } from './errors.js';

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    // Create and start the server
    const server = await createServer();
    await server.start();

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      defaultLogger.info(`Received ${signal}, shutting down gracefully`);
      try {
        await server.stop();
        process.exit(0);
      } catch (error) {
        defaultLogger.error('Error during shutdown', { error });
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Handle uncaught errors
    process.on('unhandledRejection', (reason, promise) => {
      defaultLogger.error('Unhandled Promise Rejection', {
        reason,
        promise,
      });
    });

    process.on('uncaughtException', (error) => {
      defaultLogger.error('Uncaught Exception', { error });
      process.exit(1);
    });
  } catch (error) {
    if (error instanceof ConfigurationError) {
      console.error('\n❌ Configuration Error:\n');
      console.error(error.message);
      console.error('\nPlease check your environment variables or .env file.\n');
      process.exit(1);
    }

    console.error('\n❌ Fatal Error:\n');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Start the server
main().catch((error) => {
  console.error('Fatal error starting server:', error);
  process.exit(1);
});
