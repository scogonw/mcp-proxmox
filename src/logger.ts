/**
 * Structured logging system for Proxmox MCP Server
 * Uses Winston for production-grade logging with multiple transports
 */

import winston from 'winston';
import { LogContext } from './types.js';

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

winston.addColors(logColors);

/**
 * Custom log format with context
 */
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, ...context }) => {
    const contextStr =
      Object.keys(context).length > 0
        ? `\n${JSON.stringify(context, null, 2)}`
        : '';
    return `${timestamp} [${level.toUpperCase()}]: ${message}${contextStr}`;
  })
);

/**
 * Logger instance configuration
 */
const logger = winston.createLogger({
  levels: logLevels,
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      ),
    }),
    // File transport for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.json(),
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.json(),
    }),
  ],
  // Don't exit on handled exceptions
  exitOnError: false,
});

/**
 * Structured logger class with context support
 */
export class Logger {
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.context = context;
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    return new Logger({ ...this.context, ...additionalContext });
  }

  /**
   * Log error message
   */
  error(message: string, context?: LogContext): void {
    logger.error(message, { ...this.context, ...context });
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    logger.warn(message, { ...this.context, ...context });
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    logger.info(message, { ...this.context, ...context });
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    logger.debug(message, { ...this.context, ...context });
  }

  /**
   * Log API request
   */
  logApiRequest(method: string, endpoint: string, context?: LogContext): void {
    this.debug(`API Request: ${method} ${endpoint}`, context);
  }

  /**
   * Log API response
   */
  logApiResponse(
    method: string,
    endpoint: string,
    statusCode: number,
    context?: LogContext
  ): void {
    this.debug(`API Response: ${method} ${endpoint} - ${statusCode}`, context);
  }

  /**
   * Log tool call
   */
  logToolCall(toolName: string, args: Record<string, any>): void {
    this.info(`Tool called: ${toolName}`, { args });
  }
}

/**
 * Default logger instance
 */
export const defaultLogger = new Logger({ service: 'proxmox-mcp' });

/**
 * Create logger for specific component
 */
export function createLogger(component: string): Logger {
  return new Logger({ component });
}
