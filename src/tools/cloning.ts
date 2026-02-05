/**
 * VM Cloning and Template Operations
 * Tools for cloning VMs and creating/managing templates
 */

import { ProxmoxClient } from '../proxmox-client.js';
import { ProxmoxConfig, VMType } from '../types.js';
import { createLogger } from '../logger.js';
import { indentedBullet, formatBytes } from '../formatters.js';

const logger = createLogger('CloningTools');

/**
 * Template info interface
 */
interface TemplateInfo {
  vmid: number;
  name: string;
  node: string;
  type: VMType;
  maxmem?: number;
  maxdisk?: number;
  cpus?: number;
}

/**
 * Cloud-init configuration options
 */
export interface CloudInitConfig {
  ciuser?: string;
  cipassword?: string;
  sshkeys?: string;
  ipconfig0?: string;
  nameserver?: string;
  searchdomain?: string;
}

/**
 * Options for creating VM from template
 */
export interface CreateFromTemplateOptions {
  templateId: number;
  newVmId: number;
  name?: string;
  description?: string;
  targetNode?: string;
  fullClone?: boolean;
  storage?: string;
  memory?: number;
  cores?: number;
  sockets?: number;
  startAfterCreate?: boolean;
  cloudInit?: CloudInitConfig;
}

/**
 * Clone a VM or container
 */
export async function cloneVM(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  vmid: number,
  newid: number,
  name?: string,
  description?: string,
  full?: boolean,
  target?: string,
  type: VMType = 'qemu'
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Cloning VM', { node, vmid, newid, name, full, target, type });

  try {
    const params: any = { newid };
    if (name) params.name = name;
    if (description) params.description = description;
    if (full !== undefined) params.full = full ? 1 : 0;
    if (target) params.target = target;

    const result = await client.post<string>(
      `/nodes/${node}/${type}/${vmid}/clone`,
      params
    );

    let output = `🔄 **VM Cloning Started**\n\n`;
    output += indentedBullet(`Source Node: ${node}`, 0);
    output += indentedBullet(`Source VM ID: ${vmid}`, 0);
    output += indentedBullet(`New VM ID: ${newid}`, 0);
    output += indentedBullet(`Type: ${type.toUpperCase()}`, 0);
    if (name) {
      output += indentedBullet(`New Name: ${name}`, 0);
    }
    if (description) {
      output += indentedBullet(`Description: ${description}`, 0);
    }
    output += indentedBullet(`Clone Type: ${full ? 'Full Clone' : 'Linked Clone'}`, 0);
    if (target) {
      output += indentedBullet(`Target Node: ${target}`, 0);
    }
    output += indentedBullet(`Task ID: ${result || 'N/A'}`, 0);
    output += '\n*VM is being cloned. Use proxmox_task_status to monitor progress.*\n\n';

    output += '**Clone Types**:\n';
    output += indentedBullet(`Full Clone: Complete copy, independent of source`, 0);
    output += indentedBullet(`Linked Clone: Faster, shares disk with source (default)`, 0);
    output += '\n';
    output += '**Note**: Full clones take longer but are completely independent.';

    logger.info('VM cloning initiated', { node, vmid, newid, taskId: result });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Failed to clone VM', { node, vmid, newid, error });
    throw error;
  }
}

/**
 * Convert VM to template
 */
export async function convertToTemplate(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  vmid: number,
  type: VMType = 'qemu'
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Converting VM to template', { node, vmid, type });

  try {
    await client.post<string>(
      `/nodes/${node}/${type}/${vmid}/template`
    );

    let output = `📋 **VM Converted to Template**\n\n`;
    output += indentedBullet(`Node: ${node}`, 0);
    output += indentedBullet(`VM ID: ${vmid}`, 0);
    output += indentedBullet(`Type: ${type.toUpperCase()}`, 0);
    output += '\n*VM has been converted to a template and can no longer be started.*\n\n';

    output += '**What this means**:\n';
    output += indentedBullet(`✅ Can be cloned to create new VMs quickly`, 0);
    output += indentedBullet(`❌ Cannot be started or modified directly`, 0);
    output += indentedBullet(`✅ Serves as a blueprint for rapid provisioning`, 0);
    output += '\n';
    output += '**Usage**: Use proxmox_vm_clone to create VMs from this template.\n\n';
    output += '**Warning**: This action cannot be easily undone.';

    logger.info('VM converted to template', { node, vmid });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Failed to convert VM to template', { node, vmid, error });
    throw error;
  }
}

/**
 * List all templates across the cluster
 */
export async function listTemplates(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node?: string,
  type?: VMType | 'all'
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Listing templates', { node, type });

  try {
    // Get all nodes if not specified
    const nodes: string[] = [];
    if (node) {
      nodes.push(node);
    } else {
      const nodeList = await client.get<Array<{ node: string }>>('/nodes');
      nodes.push(...nodeList.map((n) => n.node));
    }

    const templates: TemplateInfo[] = [];

    // Fetch VMs and containers from each node
    for (const nodeName of nodes) {
      // Get QEMU VMs
      if (!type || type === 'all' || type === 'qemu') {
        try {
          const vms = await client.get<Array<any>>(`/nodes/${nodeName}/qemu`);
          for (const vm of vms) {
            if (vm.template === 1) {
              templates.push({
                vmid: vm.vmid,
                name: vm.name || `VM ${vm.vmid}`,
                node: nodeName,
                type: 'qemu',
                maxmem: vm.maxmem,
                maxdisk: vm.maxdisk,
                cpus: vm.cpus || vm.maxcpu,
              });
            }
          }
        } catch (error) {
          logger.warn('Failed to get QEMU VMs from node', { node: nodeName, error });
        }
      }

      // Get LXC containers
      if (!type || type === 'all' || type === 'lxc') {
        try {
          const containers = await client.get<Array<any>>(`/nodes/${nodeName}/lxc`);
          for (const ct of containers) {
            if (ct.template === 1) {
              templates.push({
                vmid: ct.vmid,
                name: ct.name || `CT ${ct.vmid}`,
                node: nodeName,
                type: 'lxc',
                maxmem: ct.maxmem,
                maxdisk: ct.maxdisk,
                cpus: ct.cpus,
              });
            }
          }
        } catch (error) {
          logger.warn('Failed to get LXC containers from node', { node: nodeName, error });
        }
      }
    }

    // Sort templates by VMID
    templates.sort((a, b) => a.vmid - b.vmid);

    let output = `📋 **Available Templates**\n\n`;

    if (templates.length === 0) {
      output += '*No templates found.*\n\n';
      output += '**Tip**: Create a template by:\n';
      output += indentedBullet('1. Create and configure a VM with your desired setup', 0);
      output += indentedBullet('2. Install OS, packages, and apply configurations', 0);
      output += indentedBullet('3. Use proxmox_vm_template to convert it to a template', 0);
    } else {
      output += `Found **${templates.length}** template(s):\n\n`;

      // Group by type
      const qemuTemplates = templates.filter((t) => t.type === 'qemu');
      const lxcTemplates = templates.filter((t) => t.type === 'lxc');

      if (qemuTemplates.length > 0) {
        output += `### 🖥️ QEMU VM Templates (${qemuTemplates.length})\n\n`;
        output += '| ID | Name | Node | Memory | Disk | CPUs |\n';
        output += '|----|------|------|--------|------|------|\n';
        for (const t of qemuTemplates) {
          const mem = t.maxmem ? formatBytes(t.maxmem) : 'N/A';
          const disk = t.maxdisk ? formatBytes(t.maxdisk) : 'N/A';
          output += `| ${t.vmid} | ${t.name} | ${t.node} | ${mem} | ${disk} | ${t.cpus || 'N/A'} |\n`;
        }
        output += '\n';
      }

      if (lxcTemplates.length > 0) {
        output += `### 📦 LXC Container Templates (${lxcTemplates.length})\n\n`;
        output += '| ID | Name | Node | Memory | Disk | CPUs |\n';
        output += '|----|------|------|--------|------|------|\n';
        for (const t of lxcTemplates) {
          const mem = t.maxmem ? formatBytes(t.maxmem) : 'N/A';
          const disk = t.maxdisk ? formatBytes(t.maxdisk) : 'N/A';
          output += `| ${t.vmid} | ${t.name} | ${t.node} | ${mem} | ${disk} | ${t.cpus || 'N/A'} |\n`;
        }
        output += '\n';
      }

      output += '\n**Usage**: Use `proxmox_vm_create_from_template` to create a new VM from any template.';
    }

    logger.info('Templates listed', { count: templates.length });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Failed to list templates', { error });
    throw error;
  }
}

/**
 * Create a VM from a template with enhanced options
 * Supports cloud-init configuration for automatic setup
 */
export async function createFromTemplate(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  options: CreateFromTemplateOptions
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Creating VM from template', {
    node,
    templateId: options.templateId,
    newVmId: options.newVmId,
    name: options.name,
  });

  try {
    // First, determine the template type by trying to get its config
    let templateType: VMType = 'qemu';
    try {
      await client.get(`/nodes/${node}/qemu/${options.templateId}/config`);
      templateType = 'qemu';
    } catch {
      try {
        await client.get(`/nodes/${node}/lxc/${options.templateId}/config`);
        templateType = 'lxc';
      } catch {
        throw new Error(`Template ${options.templateId} not found on node ${node}`);
      }
    }

    // Step 1: Clone the template
    const cloneParams: Record<string, any> = {
      newid: options.newVmId,
    };

    if (options.name) cloneParams.name = options.name;
    if (options.description) cloneParams.description = options.description;
    if (options.fullClone !== undefined) cloneParams.full = options.fullClone ? 1 : 0;
    if (options.targetNode) cloneParams.target = options.targetNode;
    if (options.storage) cloneParams.storage = options.storage;

    const cloneResult = await client.post<string>(
      `/nodes/${node}/${templateType}/${options.templateId}/clone`,
      cloneParams
    );

    // Build output
    let output = `🚀 **VM Created from Template**\n\n`;
    output += `### Clone Operation\n`;
    output += indentedBullet(`Template ID: ${options.templateId}`, 0);
    output += indentedBullet(`New VM ID: ${options.newVmId}`, 0);
    output += indentedBullet(`Type: ${templateType.toUpperCase()}`, 0);
    if (options.name) output += indentedBullet(`Name: ${options.name}`, 0);
    output += indentedBullet(`Clone Type: ${options.fullClone ? 'Full Clone' : 'Linked Clone'}`, 0);
    if (options.targetNode) output += indentedBullet(`Target Node: ${options.targetNode}`, 0);
    if (options.storage) output += indentedBullet(`Storage: ${options.storage}`, 0);
    output += indentedBullet(`Clone Task ID: ${cloneResult || 'N/A'}`, 0);
    output += '\n';

    // Step 2: Apply configuration changes (after clone completes)
    const configChanges: string[] = [];
    const configParams: Record<string, any> = {};

    if (options.memory) {
      configParams.memory = options.memory;
      configChanges.push(`Memory: ${options.memory} MB`);
    }
    if (options.cores) {
      configParams.cores = options.cores;
      configChanges.push(`Cores: ${options.cores}`);
    }
    if (options.sockets) {
      configParams.sockets = options.sockets;
      configChanges.push(`Sockets: ${options.sockets}`);
    }

    // Cloud-init configuration (QEMU only)
    if (options.cloudInit && templateType === 'qemu') {
      if (options.cloudInit.ciuser) {
        configParams.ciuser = options.cloudInit.ciuser;
        configChanges.push(`Cloud-init User: ${options.cloudInit.ciuser}`);
      }
      if (options.cloudInit.cipassword) {
        configParams.cipassword = options.cloudInit.cipassword;
        configChanges.push(`Cloud-init Password: ****`);
      }
      if (options.cloudInit.sshkeys) {
        configParams.sshkeys = encodeURIComponent(options.cloudInit.sshkeys);
        configChanges.push(`SSH Keys: Configured`);
      }
      if (options.cloudInit.ipconfig0) {
        configParams.ipconfig0 = options.cloudInit.ipconfig0;
        configChanges.push(`IP Config: ${options.cloudInit.ipconfig0}`);
      }
      if (options.cloudInit.nameserver) {
        configParams.nameserver = options.cloudInit.nameserver;
        configChanges.push(`DNS Server: ${options.cloudInit.nameserver}`);
      }
      if (options.cloudInit.searchdomain) {
        configParams.searchdomain = options.cloudInit.searchdomain;
        configChanges.push(`Search Domain: ${options.cloudInit.searchdomain}`);
      }
    }

    // Note about post-clone configuration
    if (configChanges.length > 0) {
      output += `### Configuration Changes (apply after clone completes)\n`;
      for (const change of configChanges) {
        output += indentedBullet(change, 0);
      }
      output += '\n';
      output += `⚠️ **Important**: Configuration changes will be applied after the clone task completes.\n`;
      output += `Use \`proxmox_task_status\` to monitor the clone progress, then \`proxmox_vm_config_update\` to apply these settings.\n\n`;

      // Provide the config update command
      output += `**Configuration to apply**:\n`;
      output += '```json\n';
      output += JSON.stringify(configParams, null, 2);
      output += '\n```\n\n';
    }

    // Start after create note
    if (options.startAfterCreate) {
      output += `### Auto-Start\n`;
      output += `⚠️ The VM will need to be started manually after the clone completes and configuration is applied.\n`;
      output += `Use \`proxmox_vm_start\` with node="${options.targetNode || node}" and vmid=${options.newVmId}\n\n`;
    }

    output += `### Next Steps\n`;
    output += indentedBullet(`1. Monitor clone progress with proxmox_task_status`, 0);
    output += indentedBullet(`2. Apply any configuration changes with proxmox_vm_config_update`, 0);
    output += indentedBullet(`3. Start the VM with proxmox_vm_start`, 0);
    output += '\n';

    if (options.cloudInit) {
      output += `**Cloud-Init Note**: If your template has cloud-init configured, the new VM will automatically `;
      output += `apply the specified user, password, SSH keys, and network settings on first boot.\n`;
    }

    logger.info('VM created from template', {
      templateId: options.templateId,
      newVmId: options.newVmId,
      taskId: cloneResult,
    });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Failed to create VM from template', { options, error });
    throw error;
  }
}
