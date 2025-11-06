/**
 * Type definitions for Proxmox MCP Server
 * Provides comprehensive type safety for all Proxmox API interactions
 */

export interface ProxmoxConfig {
  host: string;
  port: number;
  user: string;
  tokenName: string;
  tokenValue: string;
  allowElevated: boolean;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface ProxmoxNode {
  node: string;
  status: 'online' | 'offline';
  uptime?: number;
  cpu?: number;
  maxcpu?: number;
  mem?: number;
  maxmem?: number;
  disk?: number;
  maxdisk?: number;
  level?: string;
  id?: string;
  type?: string;
  loadavg?: number[];
}

export interface ProxmoxVM {
  vmid: number;
  name?: string;
  node: string;
  status: 'running' | 'stopped' | 'paused';
  type: 'qemu' | 'lxc';
  uptime?: number;
  cpu?: number;
  cpus?: number;
  maxcpu?: number;
  mem?: number;
  maxmem?: number;
  disk?: number;
  maxdisk?: number;
  diskread?: number;
  diskwrite?: number;
  netin?: number;
  netout?: number;
  template?: number;
}

export interface ProxmoxVMStatus {
  vmid: number;
  name?: string;
  status: 'running' | 'stopped' | 'paused';
  uptime?: number;
  cpu?: number;
  cpus?: number;
  mem?: number;
  maxmem?: number;
  diskread?: number;
  diskwrite?: number;
  netin?: number;
  netout?: number;
  pid?: number;
  qmpstatus?: string;
  ha?: {
    managed: number;
  };
}

export interface ProxmoxStorage {
  storage: string;
  node?: string;
  type: string;
  content?: string;
  enabled?: number;
  active?: number;
  used?: number;
  avail?: number;
  total?: number;
  shared?: number;
}

export interface ProxmoxClusterNode {
  name: string;
  type: string;
  id: string;
  online: number;
  local: number;
  nodeid?: number;
  ip?: string;
  level?: string;
}

export interface ProxmoxApiResponse<T = any> {
  data: T;
}

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
}

export interface LogContext {
  node?: string;
  vmid?: number;
  tool?: string;
  error?: unknown;
  [key: string]: any;
}

export type VMType = 'qemu' | 'lxc';
export type VMTypeFilter = VMType | 'all';

export interface ToolCallContext {
  toolName: string;
  arguments: Record<string, any>;
  timestamp: Date;
}
