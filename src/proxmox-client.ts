/**
 * Proxmox API Client with retry logic and rate limiting
 * Provides robust communication with Proxmox VE API
 */

import https from 'https';
import fetch, { Response } from 'node-fetch';
import { ProxmoxConfig } from './types.js';
import {
  ProxmoxApiError,
  ProxmoxAuthenticationError,
  ProxmoxConnectionError,
  ProxmoxNotFoundError,
  ProxmoxPermissionError,
} from './errors.js';
import { Logger, createLogger } from './logger.js';

/**
 * Rate limiter for API requests
 */
class RateLimiter {
  private requests: number[] = [];
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if request is allowed and wait if necessary
   */
  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    // Remove old requests outside the window
    this.requests = this.requests.filter((time) => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);

      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        return this.waitIfNeeded();
      }
    }

    this.requests.push(now);
  }
}

/**
 * Proxmox API Client
 */
export class ProxmoxClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly httpsAgent: https.Agent;
  private readonly config: ProxmoxConfig;
  private readonly logger: Logger;
  private readonly rateLimiter: RateLimiter;

  constructor(config: ProxmoxConfig) {
    this.config = config;
    this.baseUrl = `https://${config.host}:${config.port}/api2/json`;
    this.authHeader = `PVEAPIToken=${config.user}!${config.tokenName}=${config.tokenValue}`;
    this.logger = createLogger('ProxmoxClient');

    // Create HTTPS agent that accepts self-signed certificates
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });

    // Initialize rate limiter (100 requests per minute by default)
    this.rateLimiter = new RateLimiter();
  }

  /**
   * Execute HTTP request with retry logic
   */
  private async executeRequest<T>(
    endpoint: string,
    method: string = 'GET',
    body?: any,
    retryCount: number = 0
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
    };

    const options: any = {
      method,
      headers,
      agent: this.httpsAgent,
      timeout: this.config.timeout,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      this.logger.logApiRequest(method, endpoint);

      // Wait for rate limiter
      await this.rateLimiter.waitIfNeeded();

      const response = await fetch(url, options);

      this.logger.logApiResponse(method, endpoint, response.status);

      return await this.handleResponse<T>(response, endpoint);
    } catch (error) {
      return this.handleRequestError<T>(
        error,
        endpoint,
        method,
        body,
        retryCount
      );
    }
  }

  /**
   * Handle HTTP response
   */
  private async handleResponse<T>(
    response: Response,
    endpoint: string
  ): Promise<T> {

    // Handle non-2xx responses
    if (!response.ok) {
      let errorMessage = `Proxmox API error: ${response.status} ${response.statusText}`;

      try {
        const errorData = await response.text();
        if (errorData) {
          errorMessage += ` - ${errorData}`;
        }
      } catch {
        // Ignore error reading response body
      }

      switch (response.status) {
        case 401:
          throw new ProxmoxAuthenticationError(
            'Authentication failed. Please check your API token credentials.',
            { endpoint, statusCode: response.status }
          );

        case 403:
          throw new ProxmoxPermissionError(
            'Permission denied. Your API token does not have sufficient permissions.',
            { endpoint, statusCode: response.status }
          );

        case 404:
          throw new ProxmoxNotFoundError(endpoint, {
            statusCode: response.status,
          });

        default:
          throw new ProxmoxApiError(errorMessage, response.status, {
            endpoint,
          });
      }
    }

    // Handle empty responses
    const responseText = await response.text();
    if (!responseText || responseText.trim() === '') {
      this.logger.warn('Empty response from Proxmox API', { endpoint });
      return null as T;
    }

    // Parse JSON response
    try {
      const data = JSON.parse(responseText);

      // Proxmox API wraps responses in a data property
      if (data && typeof data === 'object' && 'data' in data) {
        return data.data as T;
      }

      return data as T;
    } catch (error) {
      throw new ProxmoxApiError(
        `Failed to parse Proxmox API response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        { endpoint, responseText: responseText.substring(0, 200) }
      );
    }
  }

  /**
   * Handle request errors with retry logic
   */
  private async handleRequestError<T>(
    error: unknown,
    endpoint: string,
    method: string,
    body: any,
    retryCount: number
  ): Promise<T> {
    // Don't retry on authentication or permission errors
    if (
      error instanceof ProxmoxAuthenticationError ||
      error instanceof ProxmoxPermissionError
    ) {
      throw error;
    }

    // Check if we should retry
    if (retryCount < this.config.retryAttempts!) {
      const delay = this.calculateRetryDelay(retryCount);

      this.logger.warn(
        `Request failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${this.config.retryAttempts})`,
        { endpoint, error }
      );

      await new Promise((resolve) => setTimeout(resolve, delay));

      return this.executeRequest<T>(endpoint, method, body, retryCount + 1);
    }

    // Max retries exceeded
    if (error instanceof Error) {
      throw new ProxmoxConnectionError(
        `Failed to connect to Proxmox after ${this.config.retryAttempts} attempts: ${error.message}`,
        { endpoint, originalError: error.message }
      );
    }

    throw new ProxmoxConnectionError(
      `Failed to connect to Proxmox after ${this.config.retryAttempts} attempts`,
      { endpoint }
    );
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(retryCount: number): number {
    const baseDelay = this.config.retryDelay!;
    const maxDelay = 30000; // 30 seconds max

    // Exponential backoff with jitter
    const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
    const jitter = Math.random() * 0.3 * delay; // Add up to 30% jitter

    return Math.floor(delay + jitter);
  }

  /**
   * Make GET request
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.executeRequest<T>(endpoint, 'GET');
  }

  /**
   * Make POST request
   */
  async post<T>(endpoint: string, body?: any): Promise<T> {
    return this.executeRequest<T>(endpoint, 'POST', body);
  }

  /**
   * Make PUT request
   */
  async put<T>(endpoint: string, body?: any): Promise<T> {
    return this.executeRequest<T>(endpoint, 'PUT', body);
  }

  /**
   * Make DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.executeRequest<T>(endpoint, 'DELETE');
  }

  /**
   * Health check - verify connection to Proxmox
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.get('/version');
      return true;
    } catch (error) {
      this.logger.error('Health check failed', { error });
      return false;
    }
  }

  /**
   * Get Proxmox version
   */
  async getVersion(): Promise<{ version: string; release: string }> {
    return this.get('/version');
  }
}

/**
 * Create Proxmox client instance
 */
export function createProxmoxClient(config: ProxmoxConfig): ProxmoxClient {
  return new ProxmoxClient(config);
}
