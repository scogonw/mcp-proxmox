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
import {
  startVM,
  stopVM,
  shutdownVM,
  rebootVM,
  suspendVM,
  resumeVM,
  resetVM,
} from './tools/lifecycle.js';
import {
  createSnapshot,
  listSnapshots,
  rollbackSnapshot,
  deleteSnapshot,
  getSnapshotConfig,
} from './tools/snapshots.js';
import {
  listTasks,
  getTaskStatus,
  getTaskLog,
  stopTask,
} from './tools/tasks.js';
import {
  createBackup,
  listBackups,
  restoreBackup,
  deleteBackup,
} from './tools/backup.js';
import { cloneVM, convertToTemplate } from './tools/cloning.js';
import { getVMConfig, updateVMConfig, resizeDisk } from './tools/resources.js';
import { checkMigration, migrateVM } from './tools/migration.js';
import {
  listFirewallRules,
  createFirewallRule,
  deleteFirewallRule,
  getFirewallOptions,
} from './tools/firewall.js';

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
        version: '2.2.0',
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
          // VM Lifecycle Operations
          {
            name: 'proxmox_vm_start',
            description:
              'Start a VM or container. The VM must be in stopped state. ' +
              'Returns a task ID that can be monitored with proxmox_task_status.',
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
            name: 'proxmox_vm_stop',
            description:
              'Force stop a VM or container immediately. This is equivalent to pulling the power plug. ' +
              'For graceful shutdown, use proxmox_vm_shutdown instead.',
            inputSchema: {
              type: 'object',
              properties: {
                node: { type: 'string', description: 'Node name' },
                vmid: { type: 'number', description: 'VM ID' },
                type: {
                  type: 'string',
                  enum: ['qemu', 'lxc'],
                  default: 'qemu',
                },
              },
              required: ['node', 'vmid'],
            },
          },
          {
            name: 'proxmox_vm_shutdown',
            description:
              'Gracefully shutdown a VM or container via ACPI signal. ' +
              'The guest OS must support ACPI. If timeout is reached, the VM is forcefully stopped.',
            inputSchema: {
              type: 'object',
              properties: {
                node: { type: 'string', description: 'Node name' },
                vmid: { type: 'number', description: 'VM ID' },
                type: {
                  type: 'string',
                  enum: ['qemu', 'lxc'],
                  default: 'qemu',
                },
                timeout: {
                  type: 'number',
                  description: 'Timeout in seconds (max 3600)',
                },
              },
              required: ['node', 'vmid'],
            },
          },
          {
            name: 'proxmox_vm_reboot',
            description:
              'Reboot a VM or container. Sends reboot signal to guest OS.',
            inputSchema: {
              type: 'object',
              properties: {
                node: { type: 'string', description: 'Node name' },
                vmid: { type: 'number', description: 'VM ID' },
                type: {
                  type: 'string',
                  enum: ['qemu', 'lxc'],
                  default: 'qemu',
                },
              },
              required: ['node', 'vmid'],
            },
          },
          {
            name: 'proxmox_vm_suspend',
            description:
              'Suspend a VM to disk (QEMU only, not available for LXC containers). ' +
              'The VM state is saved and can be resumed later with proxmox_vm_resume.',
            inputSchema: {
              type: 'object',
              properties: {
                node: { type: 'string', description: 'Node name' },
                vmid: { type: 'number', description: 'VM ID (QEMU only)' },
              },
              required: ['node', 'vmid'],
            },
          },
          {
            name: 'proxmox_vm_resume',
            description:
              'Resume a suspended VM (QEMU only). Restores VM from saved state.',
            inputSchema: {
              type: 'object',
              properties: {
                node: { type: 'string', description: 'Node name' },
                vmid: { type: 'number', description: 'VM ID (QEMU only)' },
              },
              required: ['node', 'vmid'],
            },
          },
          {
            name: 'proxmox_vm_reset',
            description:
              'Hard reset a VM (QEMU only). Equivalent to pressing the reset button. ' +
              'WARNING: May cause data corruption. Use reboot for graceful restart.',
            inputSchema: {
              type: 'object',
              properties: {
                node: { type: 'string', description: 'Node name' },
                vmid: { type: 'number', description: 'VM ID (QEMU only)' },
              },
              required: ['node', 'vmid'],
            },
          },
          // Snapshot Operations
          {
            name: 'proxmox_snapshot_create',
            description:
              'Create a snapshot of a VM or container. Snapshots can be used to restore VM to a previous state. ' +
              'Optionally include VM RAM state (vmstate) for complete restore.',
            inputSchema: {
              type: 'object',
              properties: {
                node: { type: 'string', description: 'Node name' },
                vmid: { type: 'number', description: 'VM ID' },
                snapname: {
                  type: 'string',
                  description: 'Snapshot name (alphanumeric, dash, underscore only)',
                },
                description: {
                  type: 'string',
                  description: 'Optional snapshot description',
                },
                vmstate: {
                  type: 'boolean',
                  description: 'Include VM RAM state (allows running snapshot)',
                },
                type: {
                  type: 'string',
                  enum: ['qemu', 'lxc'],
                  default: 'qemu',
                },
              },
              required: ['node', 'vmid', 'snapname'],
            },
          },
          {
            name: 'proxmox_snapshot_list',
            description:
              'List all snapshots for a VM or container. Shows snapshot names, descriptions, and creation dates.',
            inputSchema: {
              type: 'object',
              properties: {
                node: { type: 'string', description: 'Node name' },
                vmid: { type: 'number', description: 'VM ID' },
                type: {
                  type: 'string',
                  enum: ['qemu', 'lxc'],
                  default: 'qemu',
                },
              },
              required: ['node', 'vmid'],
            },
          },
          {
            name: 'proxmox_snapshot_rollback',
            description:
              'Rollback VM to a specific snapshot. WARNING: Current VM state will be lost. ' +
              'The VM will be restored to the state captured in the snapshot.',
            inputSchema: {
              type: 'object',
              properties: {
                node: { type: 'string', description: 'Node name' },
                vmid: { type: 'number', description: 'VM ID' },
                snapname: {
                  type: 'string',
                  description: 'Snapshot name to rollback to',
                },
                type: {
                  type: 'string',
                  enum: ['qemu', 'lxc'],
                  default: 'qemu',
                },
              },
              required: ['node', 'vmid', 'snapname'],
            },
          },
          {
            name: 'proxmox_snapshot_delete',
            description:
              'Delete a snapshot. This frees up storage space used by the snapshot. ' +
              'Cannot be undone.',
            inputSchema: {
              type: 'object',
              properties: {
                node: { type: 'string', description: 'Node name' },
                vmid: { type: 'number', description: 'VM ID' },
                snapname: { type: 'string', description: 'Snapshot name to delete' },
                force: {
                  type: 'boolean',
                  description: 'Force deletion even if snapshot has children',
                },
                type: {
                  type: 'string',
                  enum: ['qemu', 'lxc'],
                  default: 'qemu',
                },
              },
              required: ['node', 'vmid', 'snapname'],
            },
          },
          {
            name: 'proxmox_snapshot_config',
            description:
              'Get snapshot configuration details. Shows the VM configuration at the time the snapshot was taken.',
            inputSchema: {
              type: 'object',
              properties: {
                node: { type: 'string', description: 'Node name' },
                vmid: { type: 'number', description: 'VM ID' },
                snapname: { type: 'string', description: 'Snapshot name' },
                type: {
                  type: 'string',
                  enum: ['qemu', 'lxc'],
                  default: 'qemu',
                },
              },
              required: ['node', 'vmid', 'snapname'],
            },
          },
          // Task Operations
          {
            name: 'proxmox_task_list',
            description:
              'List tasks on a node. Shows recent operations like VM starts, backups, migrations, etc. ' +
              'Useful for monitoring long-running operations.',
            inputSchema: {
              type: 'object',
              properties: {
                node: { type: 'string', description: 'Node name' },
                limit: {
                  type: 'number',
                  description: 'Maximum number of tasks to return (default 20, max 1000)',
                },
                running: {
                  type: 'boolean',
                  description: 'Only show running tasks',
                },
                errors: {
                  type: 'boolean',
                  description: 'Only show tasks with errors',
                },
              },
              required: ['node'],
            },
          },
          {
            name: 'proxmox_task_status',
            description:
              'Get detailed status of a specific task. Use the UPID from task list or operation result. ' +
              'Shows task progress, status, and optionally logs.',
            inputSchema: {
              type: 'object',
              properties: {
                node: { type: 'string', description: 'Node name' },
                upid: {
                  type: 'string',
                  description: 'Task UPID (Unique Process ID)',
                },
                includeLogs: {
                  type: 'boolean',
                  description: 'Include task logs in response',
                },
              },
              required: ['node', 'upid'],
            },
          },
          {
            name: 'proxmox_task_log',
            description:
              'Get task log output. Shows detailed log messages from a task.',
            inputSchema: {
              type: 'object',
              properties: {
                node: { type: 'string', description: 'Node name' },
                upid: { type: 'string', description: 'Task UPID' },
                start: {
                  type: 'number',
                  description: 'Start line number (for pagination)',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of log lines to return',
                },
              },
              required: ['node', 'upid'],
            },
          },
          {
            name: 'proxmox_task_stop',
            description:
              'Stop a running task. Sends stop signal to the task. ' +
              'Not all tasks can be stopped gracefully.',
            inputSchema: {
              type: 'object',
              properties: {
                node: { type: 'string', description: 'Node name' },
                upid: { type: 'string', description: 'Task UPID to stop' },
              },
              required: ['node', 'upid'],
            },
          },
          // Phase 2: Backup Operations
          {
            name: 'proxmox_backup_create',
            description:
              'Create a backup of a VM or container using vzdump. Supports snapshot, suspend, or stop mode. ' +
              'Backups are stored in the specified storage location.',
            inputSchema: {
              type: 'object',
              properties: {
                node: { type: 'string', description: 'Node name' },
                vmid: { type: 'number', description: 'VM ID to backup' },
                storage: { type: 'string', description: 'Storage location for backup' },
                mode: {
                  type: 'string',
                  enum: ['snapshot', 'suspend', 'stop'],
                  description: 'Backup mode (snapshot=live, suspend=pause, stop=shutdown)',
                },
                compress: {
                  type: 'string',
                  enum: ['none', 'lzo', 'gzip', 'zstd'],
                  description: 'Compression algorithm',
                },
                type: { type: 'string', enum: ['qemu', 'lxc'], default: 'qemu' },
              },
              required: ['node', 'vmid', 'storage'],
            },
          },
          {
            name: 'proxmox_backup_list',
            description:
              'List all backups on a storage location. Can filter by VM ID. ' +
              'Shows backup size, date, and format.',
            inputSchema: {
              type: 'object',
              properties: {
                node: { type: 'string', description: 'Node name' },
                storage: { type: 'string', description: 'Storage location' },
                vmid: { type: 'number', description: 'Optional: filter by VM ID' },
              },
              required: ['node', 'storage'],
            },
          },
          {
            name: 'proxmox_backup_restore',
            description:
              'Restore a VM from a backup archive. Can restore to a new VM ID or overwrite existing. ' +
              'WARNING: Use force=true to overwrite existing VM.',
            inputSchema: {
              type: 'object',
              properties: {
                node: { type: 'string', description: 'Target node for restore' },
                storage: { type: 'string', description: 'Storage with backup' },
                archive: { type: 'string', description: 'Backup archive filename' },
                vmid: { type: 'number', description: 'Optional: new VM ID (uses original if not specified)' },
                force: { type: 'boolean', description: 'Force overwrite existing VM' },
              },
              required: ['node', 'storage', 'archive'],
            },
          },
          {
            name: 'proxmox_backup_delete',
            description:
              'Delete a backup file from storage. This frees up space. Cannot be undone.',
            inputSchema: {
              type: 'object',
              properties: {
                node: { type: 'string', description: 'Node name' },
                storage: { type: 'string', description: 'Storage location' },
                volume: { type: 'string', description: 'Volume ID (e.g., storage:backup/filename)' },
              },
              required: ['node', 'storage', 'volume'],
            },
          },
          // Phase 2: Cloning Operations
          {
            name: 'proxmox_vm_clone',
            description:
              'Clone a VM or container. Supports full clones (independent copy) or linked clones (faster, shared storage). ' +
              'Can clone to a different node in the cluster.',
            inputSchema: {
              type: 'object',
              properties: {
                node: { type: 'string', description: 'Source node' },
                vmid: { type: 'number', description: 'Source VM ID' },
                newid: { type: 'number', description: 'New VM ID' },
                name: { type: 'string', description: 'Name for cloned VM' },
                description: { type: 'string', description: 'Description for cloned VM' },
                full: { type: 'boolean', description: 'Full clone (true) or linked clone (false)' },
                target: { type: 'string', description: 'Optional: target node (different from source)' },
                type: { type: 'string', enum: ['qemu', 'lxc'], default: 'qemu' },
              },
              required: ['node', 'vmid', 'newid'],
            },
          },
          {
            name: 'proxmox_vm_template',
            description:
              'Convert a VM to a template. Templates cannot be started but can be cloned quickly to create new VMs. ' +
              'WARNING: This action cannot be easily undone.',
            inputSchema: {
              type: 'object',
              properties: {
                node: { type: 'string', description: 'Node name' },
                vmid: { type: 'number', description: 'VM ID to convert' },
                type: { type: 'string', enum: ['qemu', 'lxc'], default: 'qemu' },
              },
              required: ['node', 'vmid'],
            },
          },
          // Phase 3: Resource Management
          {
            name: 'proxmox_vm_config_get',
            description:
              'Get complete VM configuration. Shows CPU, memory, disk, network, and all other settings ' +
              'organized by category.',
            inputSchema: {
              type: 'object',
              properties: {
                node: { type: 'string', description: 'Node name' },
                vmid: { type: 'number', description: 'VM ID' },
                type: { type: 'string', enum: ['qemu', 'lxc'], default: 'qemu' },
              },
              required: ['node', 'vmid'],
            },
          },
          {
            name: 'proxmox_vm_config_update',
            description:
              'Update VM configuration parameters. Can modify CPU, memory, boot order, and other settings. ' +
              'Some changes require VM restart to take effect.',
            inputSchema: {
              type: 'object',
              properties: {
                node: { type: 'string', description: 'Node name' },
                vmid: { type: 'number', description: 'VM ID' },
                config: {
                  type: 'object',
                  description: 'Configuration parameters to update (e.g., {"cores": 4, "memory": 4096})',
                },
                type: { type: 'string', enum: ['qemu', 'lxc'], default: 'qemu' },
              },
              required: ['node', 'vmid', 'config'],
            },
          },
          {
            name: 'proxmox_disk_resize',
            description:
              'Resize a VM disk. Can only grow disks, not shrink. Size increase is specified with a suffix ' +
              '(e.g., +10G for 10 GB increase). Guest OS may need manual partition resize afterward.',
            inputSchema: {
              type: 'object',
              properties: {
                node: { type: 'string', description: 'Node name' },
                vmid: { type: 'number', description: 'VM ID' },
                disk: { type: 'string', description: 'Disk to resize (e.g., scsi0, virtio0)' },
                size: { type: 'string', description: 'Size increase (e.g., +10G, +500M)' },
                type: { type: 'string', enum: ['qemu', 'lxc'], default: 'qemu' },
              },
              required: ['node', 'vmid', 'disk', 'size'],
            },
          },
          // Phase 3: Migration
          {
            name: 'proxmox_vm_migrate_check',
            description:
              'Check if a VM can be migrated to a target node. Shows compatibility, local disks, ' +
              'and any migration constraints. Run this before attempting migration.',
            inputSchema: {
              type: 'object',
              properties: {
                node: { type: 'string', description: 'Source node' },
                vmid: { type: 'number', description: 'VM ID' },
                target: { type: 'string', description: 'Target node' },
              },
              required: ['node', 'vmid', 'target'],
            },
          },
          {
            name: 'proxmox_vm_migrate',
            description:
              'Migrate a VM to another node. Supports online (live) migration for running VMs with minimal downtime, ' +
              'or offline migration for stopped VMs. Can migrate local disks.',
            inputSchema: {
              type: 'object',
              properties: {
                node: { type: 'string', description: 'Source node' },
                vmid: { type: 'number', description: 'VM ID' },
                target: { type: 'string', description: 'Target node' },
                online: { type: 'boolean', description: 'Online (live) migration if VM is running' },
                withLocalDisks: { type: 'boolean', description: 'Migrate local disks to target' },
              },
              required: ['node', 'vmid', 'target'],
            },
          },
          // Phase 3: Firewall
          {
            name: 'proxmox_firewall_rules_list',
            description:
              'List all firewall rules for a VM. Shows rule position, action (ACCEPT/DROP/REJECT), ' +
              'protocol, ports, source/destination, and whether rule is enabled.',
            inputSchema: {
              type: 'object',
              properties: {
                node: { type: 'string', description: 'Node name' },
                vmid: { type: 'number', description: 'VM ID' },
                type: { type: 'string', enum: ['qemu', 'lxc'], default: 'qemu' },
              },
              required: ['node', 'vmid'],
            },
          },
          {
            name: 'proxmox_firewall_rule_create',
            description:
              'Create a new firewall rule for a VM. Can control inbound/outbound traffic by protocol, port, ' +
              'and source/destination IP. Rules can be enabled immediately or created disabled.',
            inputSchema: {
              type: 'object',
              properties: {
                node: { type: 'string', description: 'Node name' },
                vmid: { type: 'number', description: 'VM ID' },
                action: { type: 'string', enum: ['ACCEPT', 'DROP', 'REJECT'], description: 'Rule action' },
                ruleType: { type: 'string', enum: ['in', 'out'], description: 'Direction (in/out)' },
                enable: { type: 'boolean', description: 'Enable rule immediately' },
                proto: { type: 'string', description: 'Protocol (tcp, udp, icmp)' },
                dport: { type: 'string', description: 'Destination port(s) (e.g., 80, 443, 22-25)' },
                source: { type: 'string', description: 'Source IP/CIDR' },
                dest: { type: 'string', description: 'Destination IP/CIDR' },
                comment: { type: 'string', description: 'Rule comment/description' },
                type: { type: 'string', enum: ['qemu', 'lxc'], default: 'qemu' },
              },
              required: ['node', 'vmid', 'action', 'ruleType'],
            },
          },
          {
            name: 'proxmox_firewall_rule_delete',
            description:
              'Delete a firewall rule by its position number. Rule positions will be automatically renumbered.',
            inputSchema: {
              type: 'object',
              properties: {
                node: { type: 'string', description: 'Node name' },
                vmid: { type: 'number', description: 'VM ID' },
                pos: { type: 'number', description: 'Rule position number' },
                type: { type: 'string', enum: ['qemu', 'lxc'], default: 'qemu' },
              },
              required: ['node', 'vmid', 'pos'],
            },
          },
          {
            name: 'proxmox_firewall_options',
            description:
              'Get firewall configuration options for a VM. Shows global firewall settings and policies.',
            inputSchema: {
              type: 'object',
              properties: {
                node: { type: 'string', description: 'Node name' },
                vmid: { type: 'number', description: 'VM ID' },
                type: { type: 'string', enum: ['qemu', 'lxc'], default: 'qemu' },
              },
              required: ['node', 'vmid'],
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

          // VM Lifecycle operations
          case 'proxmox_vm_start': {
            const validation = ArgumentValidator.vmStart(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await startVM(
              this.client,
              this.config,
              validation.data.node,
              validation.data.vmid,
              validation.data.type
            );
          }

          case 'proxmox_vm_stop': {
            const validation = ArgumentValidator.vmStop(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await stopVM(
              this.client,
              this.config,
              validation.data.node,
              validation.data.vmid,
              validation.data.type
            );
          }

          case 'proxmox_vm_shutdown': {
            const validation = ArgumentValidator.vmShutdown(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await shutdownVM(
              this.client,
              this.config,
              validation.data.node,
              validation.data.vmid,
              validation.data.type,
              validation.data.timeout
            );
          }

          case 'proxmox_vm_reboot': {
            const validation = ArgumentValidator.vmReboot(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await rebootVM(
              this.client,
              this.config,
              validation.data.node,
              validation.data.vmid,
              validation.data.type
            );
          }

          case 'proxmox_vm_suspend': {
            const validation = ArgumentValidator.vmSuspend(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await suspendVM(
              this.client,
              this.config,
              validation.data.node,
              validation.data.vmid
            );
          }

          case 'proxmox_vm_resume': {
            const validation = ArgumentValidator.vmResume(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await resumeVM(
              this.client,
              this.config,
              validation.data.node,
              validation.data.vmid
            );
          }

          case 'proxmox_vm_reset': {
            const validation = ArgumentValidator.vmReset(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await resetVM(
              this.client,
              this.config,
              validation.data.node,
              validation.data.vmid
            );
          }

          // Snapshot operations
          case 'proxmox_snapshot_create': {
            const validation = ArgumentValidator.snapshotCreate(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await createSnapshot(
              this.client,
              this.config,
              validation.data.node,
              validation.data.vmid,
              validation.data.snapname,
              validation.data.description,
              validation.data.vmstate,
              validation.data.type
            );
          }

          case 'proxmox_snapshot_list': {
            const validation = ArgumentValidator.snapshotList(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await listSnapshots(
              this.client,
              this.config,
              validation.data.node,
              validation.data.vmid,
              validation.data.type
            );
          }

          case 'proxmox_snapshot_rollback': {
            const validation = ArgumentValidator.snapshotRollback(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await rollbackSnapshot(
              this.client,
              this.config,
              validation.data.node,
              validation.data.vmid,
              validation.data.snapname,
              validation.data.type
            );
          }

          case 'proxmox_snapshot_delete': {
            const validation = ArgumentValidator.snapshotDelete(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await deleteSnapshot(
              this.client,
              this.config,
              validation.data.node,
              validation.data.vmid,
              validation.data.snapname,
              validation.data.force,
              validation.data.type
            );
          }

          case 'proxmox_snapshot_config': {
            const validation = ArgumentValidator.snapshotConfig(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await getSnapshotConfig(
              this.client,
              this.config,
              validation.data.node,
              validation.data.vmid,
              validation.data.snapname,
              validation.data.type
            );
          }

          // Task operations
          case 'proxmox_task_list': {
            const validation = ArgumentValidator.taskList(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await listTasks(
              this.client,
              this.config,
              validation.data.node,
              validation.data.limit,
              validation.data.running,
              validation.data.errors
            );
          }

          case 'proxmox_task_status': {
            const validation = ArgumentValidator.taskStatus(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await getTaskStatus(
              this.client,
              this.config,
              validation.data.node,
              validation.data.upid,
              validation.data.includeLogs
            );
          }

          case 'proxmox_task_log': {
            const validation = ArgumentValidator.taskLog(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await getTaskLog(
              this.client,
              this.config,
              validation.data.node,
              validation.data.upid,
              validation.data.start,
              validation.data.limit
            );
          }

          case 'proxmox_task_stop': {
            const validation = ArgumentValidator.taskStop(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await stopTask(
              this.client,
              this.config,
              validation.data.node,
              validation.data.upid
            );
          }

          // Backup operations
          case 'proxmox_backup_create': {
            const validation = ArgumentValidator.backupCreate(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await createBackup(
              this.client,
              this.config,
              validation.data.node,
              validation.data.vmid,
              validation.data.storage,
              validation.data.mode,
              validation.data.compress,
              validation.data.type
            );
          }

          case 'proxmox_backup_list': {
            const validation = ArgumentValidator.backupList(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await listBackups(
              this.client,
              this.config,
              validation.data.node,
              validation.data.storage,
              validation.data.vmid
            );
          }

          case 'proxmox_backup_restore': {
            const validation = ArgumentValidator.backupRestore(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await restoreBackup(
              this.client,
              this.config,
              validation.data.node,
              validation.data.storage,
              validation.data.archive,
              validation.data.vmid,
              validation.data.force
            );
          }

          case 'proxmox_backup_delete': {
            const validation = ArgumentValidator.backupDelete(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await deleteBackup(
              this.client,
              this.config,
              validation.data.node,
              validation.data.storage,
              validation.data.volume
            );
          }

          // Cloning operations
          case 'proxmox_vm_clone': {
            const validation = ArgumentValidator.cloneVM(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await cloneVM(
              this.client,
              this.config,
              validation.data.node,
              validation.data.vmid,
              validation.data.newid,
              validation.data.name,
              validation.data.description,
              validation.data.full,
              validation.data.target,
              validation.data.type
            );
          }

          case 'proxmox_vm_template': {
            const validation = ArgumentValidator.convertToTemplate(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await convertToTemplate(
              this.client,
              this.config,
              validation.data.node,
              validation.data.vmid,
              validation.data.type
            );
          }

          // Resource management operations
          case 'proxmox_vm_config_get': {
            const validation = ArgumentValidator.vmConfigGet(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await getVMConfig(
              this.client,
              this.config,
              validation.data.node,
              validation.data.vmid,
              validation.data.type
            );
          }

          case 'proxmox_vm_config_update': {
            const validation = ArgumentValidator.vmConfigUpdate(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await updateVMConfig(
              this.client,
              this.config,
              validation.data.node,
              validation.data.vmid,
              validation.data.config,
              validation.data.type
            );
          }

          case 'proxmox_disk_resize': {
            const validation = ArgumentValidator.diskResize(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await resizeDisk(
              this.client,
              this.config,
              validation.data.node,
              validation.data.vmid,
              validation.data.disk,
              validation.data.size,
              validation.data.type
            );
          }

          // Migration operations
          case 'proxmox_vm_migrate_check': {
            const validation = ArgumentValidator.migrationCheck(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await checkMigration(
              this.client,
              this.config,
              validation.data.node,
              validation.data.vmid,
              validation.data.target
            );
          }

          case 'proxmox_vm_migrate': {
            const validation = ArgumentValidator.migrateVM(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await migrateVM(
              this.client,
              this.config,
              validation.data.node,
              validation.data.vmid,
              validation.data.target,
              validation.data.online,
              validation.data.withLocalDisks
            );
          }

          // Firewall operations
          case 'proxmox_firewall_rules_list': {
            const validation = ArgumentValidator.firewallList(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await listFirewallRules(
              this.client,
              this.config,
              validation.data.node,
              validation.data.vmid,
              validation.data.type
            );
          }

          case 'proxmox_firewall_rule_create': {
            const validation = ArgumentValidator.firewallCreate(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await createFirewallRule(
              this.client,
              this.config,
              validation.data.node,
              validation.data.vmid,
              validation.data.action,
              validation.data.ruleType,
              validation.data.enable,
              validation.data.proto,
              validation.data.dport,
              validation.data.source,
              validation.data.dest,
              validation.data.comment,
              validation.data.type
            );
          }

          case 'proxmox_firewall_rule_delete': {
            const validation = ArgumentValidator.firewallDelete(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await deleteFirewallRule(
              this.client,
              this.config,
              validation.data.node,
              validation.data.vmid,
              validation.data.pos,
              validation.data.type
            );
          }

          case 'proxmox_firewall_options': {
            const validation = ArgumentValidator.firewallOptions(args || {});
            if (!validation.success) {
              throw new Error(`Invalid arguments: ${validation.error}`);
            }
            return await getFirewallOptions(
              this.client,
              this.config,
              validation.data.node,
              validation.data.vmid,
              validation.data.type
            );
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
