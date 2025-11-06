/**
 * Resource Management Tools
 * Tools for managing VM resources (CPU, memory, disks, configuration)
 */

import { ProxmoxClient } from '../proxmox-client.js';
import { ProxmoxConfig, VMType } from '../types.js';
import { createLogger } from '../logger.js';
import { indentedBullet, sectionHeader } from '../formatters.js';

const logger = createLogger('ResourceTools');

/**
 * Get VM configuration
 */
export async function getVMConfig(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  vmid: number,
  type: VMType = 'qemu'
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Getting VM configuration', { node, vmid, type });

  try {
    const config = await client.get<any>(
      `/nodes/${node}/${type}/${vmid}/config`
    );

    let output = sectionHeader(`VM ${vmid} Configuration`, '⚙️') + '\n\n';
    output += `**Node**: ${node}\n`;
    output += `**Type**: ${type.toUpperCase()}\n\n`;

    // Group configuration by category
    const categories: Record<string, any[]> = {
      'General': [],
      'Hardware': [],
      'Boot': [],
      'Network': [],
      'Disks': [],
      'Other': [],
    };

    for (const [key, value] of Object.entries(config)) {
      if (key === 'digest') continue; // Skip digest

      let category = 'Other';
      if (['name', 'description', 'tags', 'onboot', 'ostype', 'arch'].includes(key)) {
        category = 'General';
      } else if (['cores', 'sockets', 'cpu', 'memory', 'balloon'].includes(key)) {
        category = 'Hardware';
      } else if (['boot', 'bootdisk'].includes(key)) {
        category = 'Boot';
      } else if (key.startsWith('net')) {
        category = 'Network';
      } else if (key.startsWith('scsi') || key.startsWith('virtio') || key.startsWith('ide') || key.startsWith('sata')) {
        category = 'Disks';
      }

      categories[category].push({ key, value });
    }

    // Display categorized configuration
    for (const [category, items] of Object.entries(categories)) {
      if (items.length > 0) {
        output += `**${category}**:\n`;
        for (const { key, value } of items) {
          const displayValue = typeof value === 'object' ? JSON.stringify(value) : value;
          output += indentedBullet(`${key}: ${displayValue}`);
        }
        output += '\n';
      }
    }

    logger.info('VM configuration retrieved', { node, vmid });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Failed to get VM configuration', { node, vmid, error });
    throw error;
  }
}

/**
 * Update VM configuration
 */
export async function updateVMConfig(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  vmid: number,
  configUpdates: Record<string, any>,
  type: VMType = 'qemu'
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Updating VM configuration', { node, vmid, configUpdates, type });

  try {
    await client.put<string>(
      `/nodes/${node}/${type}/${vmid}/config`,
      configUpdates
    );

    let output = `⚙️ **VM ${vmid} Configuration Updated**\n\n`;
    output += indentedBullet(`Node: ${node}`, 0);
    output += indentedBullet(`VM ID: ${vmid}`, 0);
    output += indentedBullet(`Type: ${type.toUpperCase()}`, 0);
    output += '\n**Updated Parameters**:\n';

    for (const [key, value] of Object.entries(configUpdates)) {
      output += indentedBullet(`${key}: ${value}`);
    }

    output += '\n*Configuration has been updated successfully.*\n\n';
    output += '**Note**: Some changes may require a VM restart to take effect.';

    logger.info('VM configuration updated', { node, vmid, updates: Object.keys(configUpdates) });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Failed to update VM configuration', { node, vmid, error });
    throw error;
  }
}

/**
 * Resize VM disk
 */
export async function resizeDisk(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  vmid: number,
  disk: string,
  size: string,
  type: VMType = 'qemu'
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Resizing VM disk', { node, vmid, disk, size, type });

  try {
    await client.put<string>(
      `/nodes/${node}/${type}/${vmid}/resize`,
      { disk, size }
    );

    let output = `💿 **Disk Resized for VM ${vmid}**\n\n`;
    output += indentedBullet(`Node: ${node}`, 0);
    output += indentedBullet(`VM ID: ${vmid}`, 0);
    output += indentedBullet(`Type: ${type.toUpperCase()}`, 0);
    output += indentedBullet(`Disk: ${disk}`, 0);
    output += indentedBullet(`Size Increase: ${size}`, 0);
    output += '\n*Disk has been resized successfully.*\n\n';

    output += '**Important Notes**:\n';
    output += indentedBullet(`✅ Disk size increased on hypervisor level`, 0);
    output += indentedBullet(`⚠️ Guest OS may need manual partition resize`, 0);
    output += indentedBullet(`⚠️ Cannot shrink disks, only grow them`, 0);
    output += '\n';
    output += '**Next Steps**:\n';
    output += indentedBullet(`1. Log into the VM`, 0);
    output += indentedBullet(`2. Expand the partition (e.g., with gparted or fdisk)`, 0);
    output += indentedBullet(`3. Resize the filesystem (e.g., resize2fs for ext4)`, 0);

    logger.info('Disk resized', { node, vmid, disk, size });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Failed to resize disk', { node, vmid, disk, size, error });
    throw error;
  }
}
