/**
 * VM Creation Tools
 * Create new virtual machines and containers in Proxmox
 */

import { ProxmoxClient } from '../proxmox-client.js';
import { ProxmoxConfig, VMType } from '../types.js';
import { createLogger } from '../logger.js';

const logger = createLogger('CreationTools');

/**
 * Configuration options for creating a QEMU VM
 */
export interface QemuVMConfig {
  vmid: number;
  name?: string;
  memory?: number;
  cores?: number;
  sockets?: number;
  ostype?: string;
  iso?: string;
  storage?: string;
  diskSize?: string;
  net0?: string;
  start?: boolean;
  description?: string;
  cpu?: string;
  bios?: 'seabios' | 'ovmf';
  machine?: string;
  agent?: boolean;
}

/**
 * Configuration options for creating an LXC container
 */
export interface LxcContainerConfig {
  vmid: number;
  ostemplate: string;
  hostname?: string;
  memory?: number;
  swap?: number;
  cores?: number;
  storage?: string;
  rootfsSize?: string;
  password?: string;
  sshPublicKeys?: string;
  net0?: string;
  start?: boolean;
  unprivileged?: boolean;
  description?: string;
}

/**
 * Create a QEMU virtual machine
 */
export async function createQemuVM(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  vmConfig: QemuVMConfig
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Creating QEMU VM', { node, vmid: vmConfig.vmid, name: vmConfig.name });

  try {
    // Build the API parameters
    const params: Record<string, any> = {
      vmid: vmConfig.vmid,
    };

    // Optional parameters
    if (vmConfig.name) params.name = vmConfig.name;
    if (vmConfig.description) params.description = vmConfig.description;
    if (vmConfig.memory) params.memory = vmConfig.memory;
    if (vmConfig.cores) params.cores = vmConfig.cores;
    if (vmConfig.sockets) params.sockets = vmConfig.sockets;
    if (vmConfig.ostype) params.ostype = vmConfig.ostype;
    if (vmConfig.cpu) params.cpu = vmConfig.cpu;
    if (vmConfig.bios) params.bios = vmConfig.bios;
    if (vmConfig.machine) params.machine = vmConfig.machine;
    if (vmConfig.agent !== undefined) params.agent = vmConfig.agent ? 1 : 0;
    if (vmConfig.start !== undefined) params.start = vmConfig.start ? 1 : 0;

    // Handle ISO/CDROM
    if (vmConfig.iso) {
      params.cdrom = vmConfig.iso;
    }

    // Handle disk configuration
    if (vmConfig.storage && vmConfig.diskSize) {
      params.scsi0 = `${vmConfig.storage}:${vmConfig.diskSize}`;
      params.scsihw = 'virtio-scsi-pci';
    }

    // Handle network configuration
    if (vmConfig.net0) {
      params.net0 = vmConfig.net0;
    } else {
      // Default network configuration
      params.net0 = 'virtio,bridge=vmbr0';
    }

    const result = await client.post<string>(
      `/nodes/${node}/qemu`,
      params
    );

    let output = `🖥️ **QEMU VM Creation Initiated**\n\n`;
    output += `• **Node**: ${node}\n`;
    output += `• **VM ID**: ${vmConfig.vmid}\n`;
    if (vmConfig.name) output += `• **Name**: ${vmConfig.name}\n`;
    if (vmConfig.memory) output += `• **Memory**: ${vmConfig.memory} MB\n`;
    if (vmConfig.cores) output += `• **CPU Cores**: ${vmConfig.cores}\n`;
    if (vmConfig.ostype) output += `• **OS Type**: ${vmConfig.ostype}\n`;
    if (vmConfig.storage) output += `• **Storage**: ${vmConfig.storage}\n`;
    if (vmConfig.diskSize) output += `• **Disk Size**: ${vmConfig.diskSize}\n`;
    if (vmConfig.iso) output += `• **ISO**: ${vmConfig.iso}\n`;
    output += `• **Task ID**: ${result || 'N/A'}\n\n`;
    output += '*VM creation is in progress. Use proxmox_task_status to monitor progress.*\n\n';
    output += '**Note**: After creation, you may need to start the VM manually unless start=true was specified.';

    logger.info('QEMU VM creation command sent', { node, vmid: vmConfig.vmid, taskId: result });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Failed to create QEMU VM', { node, vmConfig, error });
    throw error;
  }
}

/**
 * Create an LXC container
 */
export async function createLxcContainer(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  containerConfig: LxcContainerConfig
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Creating LXC container', { node, vmid: containerConfig.vmid, hostname: containerConfig.hostname });

  try {
    // Build the API parameters
    const params: Record<string, any> = {
      vmid: containerConfig.vmid,
      ostemplate: containerConfig.ostemplate,
    };

    // Optional parameters
    if (containerConfig.hostname) params.hostname = containerConfig.hostname;
    if (containerConfig.description) params.description = containerConfig.description;
    if (containerConfig.memory) params.memory = containerConfig.memory;
    if (containerConfig.swap !== undefined) params.swap = containerConfig.swap;
    if (containerConfig.cores) params.cores = containerConfig.cores;
    if (containerConfig.password) params.password = containerConfig.password;
    if (containerConfig.sshPublicKeys) params['ssh-public-keys'] = containerConfig.sshPublicKeys;
    if (containerConfig.unprivileged !== undefined) params.unprivileged = containerConfig.unprivileged ? 1 : 0;
    if (containerConfig.start !== undefined) params.start = containerConfig.start ? 1 : 0;

    // Handle root filesystem
    if (containerConfig.storage) {
      const rootfsSize = containerConfig.rootfsSize || '8G';
      params.rootfs = `${containerConfig.storage}:${rootfsSize}`;
    }

    // Handle network configuration
    if (containerConfig.net0) {
      params.net0 = containerConfig.net0;
    } else {
      // Default network configuration
      params.net0 = 'name=eth0,bridge=vmbr0,ip=dhcp';
    }

    const result = await client.post<string>(
      `/nodes/${node}/lxc`,
      params
    );

    let output = `📦 **LXC Container Creation Initiated**\n\n`;
    output += `• **Node**: ${node}\n`;
    output += `• **Container ID**: ${containerConfig.vmid}\n`;
    if (containerConfig.hostname) output += `• **Hostname**: ${containerConfig.hostname}\n`;
    output += `• **Template**: ${containerConfig.ostemplate}\n`;
    if (containerConfig.memory) output += `• **Memory**: ${containerConfig.memory} MB\n`;
    if (containerConfig.cores) output += `• **CPU Cores**: ${containerConfig.cores}\n`;
    if (containerConfig.storage) output += `• **Storage**: ${containerConfig.storage}\n`;
    if (containerConfig.rootfsSize) output += `• **Root FS Size**: ${containerConfig.rootfsSize}\n`;
    output += `• **Unprivileged**: ${containerConfig.unprivileged !== false ? 'Yes' : 'No'}\n`;
    output += `• **Task ID**: ${result || 'N/A'}\n\n`;
    output += '*Container creation is in progress. Use proxmox_task_status to monitor progress.*\n\n';
    output += '**Note**: After creation, you may need to start the container manually unless start=true was specified.';

    logger.info('LXC container creation command sent', { node, vmid: containerConfig.vmid, taskId: result });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Failed to create LXC container', { node, containerConfig, error });
    throw error;
  }
}

/**
 * Delete a VM or container
 */
export async function deleteVM(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  vmid: number,
  type: VMType = 'qemu',
  purge?: boolean,
  destroyUnreferencedDisks?: boolean
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Deleting VM', { node, vmid, type, purge, destroyUnreferencedDisks });

  try {
    // Build query parameters
    let endpoint = `/nodes/${node}/${type}/${vmid}`;
    const queryParams: string[] = [];

    if (purge) {
      queryParams.push('purge=1');
    }
    if (destroyUnreferencedDisks) {
      queryParams.push('destroy-unreferenced-disks=1');
    }

    if (queryParams.length > 0) {
      endpoint += '?' + queryParams.join('&');
    }

    const result = await client.delete<string>(endpoint);

    const typeLabel = type === 'qemu' ? 'VM' : 'Container';
    let output = `🗑️ **${typeLabel} ${vmid} Deletion Initiated**\n\n`;
    output += `• **Node**: ${node}\n`;
    output += `• **${typeLabel} ID**: ${vmid}\n`;
    output += `• **Type**: ${type.toUpperCase()}\n`;
    if (purge) output += `• **Purge**: Yes (removing from backup jobs & HA)\n`;
    if (destroyUnreferencedDisks) output += `• **Destroy Unreferenced Disks**: Yes\n`;
    output += `• **Task ID**: ${result || 'N/A'}\n\n`;
    output += `*${typeLabel} deletion is in progress. Use proxmox_task_status to monitor progress.*\n\n`;
    output += `**Warning**: This action cannot be undone. All data will be permanently deleted.`;

    logger.info('VM deletion command sent', { node, vmid, type, taskId: result });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Failed to delete VM', { node, vmid, type, error });
    throw error;
  }
}
