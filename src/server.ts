/**
 * Main Proxmox MCP Server
 * Implements MCP 2025-06-18 specification with structured tool outputs
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ProxmoxClient, createProxmoxClient } from './proxmox-client.js';
import { ProxmoxConfig } from './types.js';
import { getConfig } from './config.js';
import { createLogger, Logger } from './logger.js';
import { formatError } from './errors.js';
import { ArgumentValidator } from './validation.js';

// Import tool handlers
import { getNodes, getNodeStatus } from './tools/nodes.js';
import { getVMs, getVMStatus, executeVMCommand } from './tools/vms.js';
import { getStorage } from './tools/storage.js';
import { getClusterStatus } from './tools/cluster.js';

/**
 * Proxmox MCP Server
 */
export class ProxmoxMCPServer {
  private server: Server;
  private client: ProxmoxClient;
  private config: ProxmoxConfig;
  private logger: Logger;

  constructor(config: ProxmoxConfig) {
    this.config = config;
    this.logger = createLogger('ProxmoxMCPServer');

    // Create Proxmox API client
    this.client = createProxmoxClient(config);

    // Initialize MCP server with metadata
    this.server = new Server(
      {
        name: 'proxmox-mcp-server',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  /**
   * Setup MCP request handlers
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      this.logger.info('Listing available tools');

      return {
        tools: [
          {
            name: 'proxmox_get_nodes',
            description:
              'List all Proxmox cluster nodes with their status and resource usage. ' +
              'Shows CPU, memory, uptime, and load average for each node.',
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
          {
            name: 'proxmox_get_node_status',
            description:
              'Get detailed status information for a specific Proxmox node. ' +
              'Requires elevated permissions. Shows comprehensive resource metrics.',
            inputSchema: {
              type: 'object',
              properties: {
                node: {
                  type: 'string',
                  description: 'Node name (e.g., pve1, proxmox-node2)',
                },
              },
              required: ['node'],
            },
          },
          {
            name: 'proxmox_get_vms',
            description:
              'List all virtual machines and containers across the cluster. ' +
              'Can filter by node and VM type (QEMU/LXC). Shows status, resources, and uptime.',
            inputSchema: {
              type: 'object',
              properties: {
                node: {
                  type: 'string',
                  description: 'Optional: filter by specific node name',
                },
                type: {
                  type: 'string',
                  enum: ['qemu', 'lxc', 'all'],
                  description: 'VM type filter (qemu, lxc, or all)',
                  default: 'all',
                },
              },
              required: [],
            },
          },
          {
            name: 'proxmox_get_vm_status',
            description:
              'Get detailed status information for a specific virtual machine or container. ' +
              'Shows resource usage, network traffic, disk I/O, and uptime.',
            inputSchema: {
              type: 'object',
              properties: {
                node: {
                  type: 'string',
                  description: 'Node name where VM is located',
                },
                vmid: {
                  type: 'number',
                  description: 'VM ID number (e.g., 100, 101)',
                },
                type: {
                  type: 'string',
                  enum: ['qemu', 'lxc'],
                  description: 'VM type (qemu for VMs, lxc for containers)',
                  default: 'qemu',
                },
              },
              required: ['node', 'vmid'],
            },
          },
          {
            name: 'proxmox_execute_vm_command',
            description:
              'Execute a shell command on a virtual machine via Proxmox API. ' +
              'Requires elevated permissions. For QEMU VMs, requires QEMU Guest Agent.',
            inputSchema: {
              type: 'object',
              properties: {
                node: {
                  type: 'string',
                  description: 'Node name where VM is located',
                },
                vmid: {
                  type: 'number',
                  description: 'VM ID number',
                },
                command: {
                  type: 'string',
                  description: 'Shell command to execute',
                },
                type: {
                  type: 'string',
                  enum: ['qemu', 'lxc'],
                  description: 'VM type',
                  default: 'qemu',
                },
              },
              required: ['node', 'vmid', 'command'],
            },
          },
          {
            name: 'proxmox_get_storage',
            description:
              'List all storage pools and their usage across the cluster. ' +
              'Shows storage type, content types, usage statistics, and status.',
            inputSchema: {
              type: 'object',
              properties: {
                node: {
                  type: 'string',
                  description: 'Optional: filter by specific node name',
                },
              },
              required: [],
            },
          },
          {
            name: 'proxmox_get_cluster_status',
            description:
              'Get overall cluster status including node health and resource usage. ' +
              'Shows cluster health, online nodes, and aggregated resource statistics.',
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      this.logger.logToolCall(name, args || {});

      try {
        // Route to appropriate tool handler with validation
        switch (name) {
          case 'proxmox_get_nodes': {
            const validation = ArgumentValidator.getNodes(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await getNodes(this.client, this.config);
          }

          case 'proxmox_get_node_status': {
            const validation = ArgumentValidator.getNodeStatus(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await getNodeStatus(
              this.client,
              this.config,
              validation.data.node
            );
          }

          case 'proxmox_get_vms': {
            const validation = ArgumentValidator.getVms(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await getVMs(
              this.client,
              this.config,
              validation.data.node,
              validation.data.type
            );
          }

          case 'proxmox_get_vm_status': {
            const validation = ArgumentValidator.getVmStatus(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await getVMStatus(
              this.client,
              this.config,
              validation.data.node,
              validation.data.vmid,
              validation.data.type
            );
          }

          case 'proxmox_execute_vm_command': {
            const validation = ArgumentValidator.executeVmCommand(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await executeVMCommand(
              this.client,
              this.config,
              validation.data.node,
              validation.data.vmid,
              validation.data.command,
              validation.data.type
            );
          }

          case 'proxmox_get_storage': {
            const validation = ArgumentValidator.getStorage(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await getStorage(
              this.client,
              this.config,
              validation.data.node
            );
          }

          case 'proxmox_get_cluster_status': {
            const validation = ArgumentValidator.getClusterStatus(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await getClusterStatus(this.client, this.config);
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        this.logger.error('Tool execution failed', {
          tool: name,
          error,
          args,
        });

        return {
          content: [
            {
              type: 'text',
              text: formatError(error),
            },
          ],
        };
      }
    });
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    this.logger.info('Starting Proxmox MCP Server', {
      host: this.config.host,
      allowElevated: this.config.allowElevated,
    });

    // Perform health check
    const isHealthy = await this.client.healthCheck();
    if (!isHealthy) {
      this.logger.error('Proxmox health check failed - server may not be reachable');
      // Continue anyway - errors will be reported on tool calls
    } else {
      this.logger.info('Proxmox health check passed');
    }

    // Connect to stdio transport
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    this.logger.info('Proxmox MCP server running on stdio');
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    this.logger.info('Stopping Proxmox MCP Server');
    await this.server.close();
  }
}

/**
 * Create and start the server
 */
export async function createServer(): Promise<ProxmoxMCPServer> {
  const config = getConfig();
  const server = new ProxmoxMCPServer(config);
  return server;
}
