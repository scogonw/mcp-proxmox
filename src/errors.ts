/**
 * Custom error classes for Proxmox MCP Server
 * Provides structured error handling with proper context
 */

export class ProxmoxError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = 'ProxmoxError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ProxmoxConnectionError extends ProxmoxError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'PROXMOX_CONNECTION_ERROR', undefined, context);
    this.name = 'ProxmoxConnectionError';
  }
}

export class ProxmoxAuthenticationError extends ProxmoxError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'PROXMOX_AUTH_ERROR', 401, context);
    this.name = 'ProxmoxAuthenticationError';
  }
}

export class ProxmoxPermissionError extends ProxmoxError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'PROXMOX_PERMISSION_ERROR', 403, context);
    this.name = 'ProxmoxPermissionError';
  }
}

export class ProxmoxNotFoundError extends ProxmoxError {
  constructor(resource: string, context?: Record<string, any>) {
    super(`Resource not found: ${resource}`, 'PROXMOX_NOT_FOUND', 404, context);
    this.name = 'ProxmoxNotFoundError';
  }
}

export class ProxmoxValidationError extends ProxmoxError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'PROXMOX_VALIDATION_ERROR', 400, context);
    this.name = 'ProxmoxValidationError';
  }
}

export class ProxmoxApiError extends ProxmoxError {
  constructor(
    message: string,
    statusCode: number,
    context?: Record<string, any>
  ) {
    super(message, 'PROXMOX_API_ERROR', statusCode, context);
    this.name = 'ProxmoxApiError';
  }
}

export class ConfigurationError extends ProxmoxError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'CONFIGURATION_ERROR', undefined, context);
    this.name = 'ConfigurationError';
  }
}

/**
 * Check if an error is a Proxmox error
 */
export function isProxmoxError(error: unknown): error is ProxmoxError {
  return error instanceof ProxmoxError;
}

/**
 * Format error for user display
 */
export function formatError(error: unknown): string {
  if (isProxmoxError(error)) {
    let message = `❌ **${error.name}**\n\n${error.message}`;

    if (error.statusCode) {
      message += `\n\n**Status Code**: ${error.statusCode}`;
    }

    if (error.context && Object.keys(error.context).length > 0) {
      message += `\n\n**Context**:\n`;
      for (const [key, value] of Object.entries(error.context)) {
        message += `• ${key}: ${value}\n`;
      }
    }

    return message;
  }

  if (error instanceof Error) {
    return `❌ **Error**\n\n${error.message}`;
  }

  return `❌ **Unknown Error**\n\n${String(error)}`;
}
