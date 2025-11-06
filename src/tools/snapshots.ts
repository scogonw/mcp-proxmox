/**
 * Snapshot Management Tools
 * Create, list, rollback, and delete VM snapshots
 */

import { ProxmoxClient } from '../proxmox-client.js';
import { ProxmoxConfig, VMType } from '../types.js';
import { createLogger } from '../logger.js';
import { indentedBullet, sectionHeader } from '../formatters.js';

const logger = createLogger('SnapshotTools');

interface Snapshot {
  name: string;
  description?: string;
  snaptime?: number;
  vmstate?: number;
  parent?: string;
}

/**
 * Create a snapshot
 */
export async function createSnapshot(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  vmid: number,
  snapname: string,
  description?: string,
  vmstate?: boolean,
  type: VMType = 'qemu'
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Creating snapshot', { node, vmid, snapname, type });

  try {
    const params: any = { snapname };
    if (description) params.description = description;
    if (vmstate !== undefined) params.vmstate = vmstate ? 1 : 0;

    const result = await client.post<string>(
      `/nodes/${node}/${type}/${vmid}/snapshot`,
      params
    );

    let output = `📸 **Snapshot Created for VM ${vmid}**\n\n`;
    output += indentedBullet(`Node: ${node}`, 0);
    output += indentedBullet(`VM ID: ${vmid}`, 0);
    output += indentedBullet(`Type: ${type.toUpperCase()}`, 0);
    output += indentedBullet(`Snapshot Name: ${snapname}`, 0);
    if (description) {
      output += indentedBullet(`Description: ${description}`, 0);
    }
    if (vmstate) {
      output += indentedBullet(`VM State: Included (RAM saved)`, 0);
    }
    output += indentedBullet(`Task ID: ${result || 'N/A'}`, 0);
    output += '\n*Snapshot is being created. Use proxmox_task_status to monitor progress.*\n\n';
    output += '**Note**: Use proxmox_snapshot_rollback to restore to this point.';

    logger.info('Snapshot creation initiated', { node, vmid, snapname, taskId: result });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Failed to create snapshot', { node, vmid, snapname, error });
    throw error;
  }
}

/**
 * List all snapshots for a VM
 */
export async function listSnapshots(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  vmid: number,
  type: VMType = 'qemu'
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Listing snapshots', { node, vmid, type });

  try {
    const snapshots = await client.get<Snapshot[]>(
      `/nodes/${node}/${type}/${vmid}/snapshot`
    );

    let output = sectionHeader(`Snapshots for VM ${vmid}`, '📸') + '\n\n';

    if (!snapshots || snapshots.length === 0) {
      output += 'No snapshots found for this VM.\n';
    } else {
      // Filter out the 'current' pseudo-snapshot
      const realSnapshots = snapshots.filter(s => s.name !== 'current');

      if (realSnapshots.length === 0) {
        output += 'No snapshots found for this VM.\n';
      } else {
        output += `**Total Snapshots**: ${realSnapshots.length}\n\n`;

        for (const snap of realSnapshots) {
          output += `📷 **${snap.name}**\n`;
          if (snap.description) {
            output += indentedBullet(`Description: ${snap.description}`);
          }
          if (snap.snaptime) {
            const date = new Date(snap.snaptime * 1000).toLocaleString();
            output += indentedBullet(`Created: ${date}`);
          }
          if (snap.vmstate) {
            output += indentedBullet(`VM State: Saved`);
          }
          if (snap.parent) {
            output += indentedBullet(`Parent: ${snap.parent}`);
          }
          output += '\n';
        }

        output += '\n*Use proxmox_snapshot_rollback to restore to any snapshot.*';
      }
    }

    logger.info(`Retrieved ${snapshots.length} snapshots`, { node, vmid });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Failed to list snapshots', { node, vmid, error });
    throw error;
  }
}

/**
 * Rollback to a snapshot
 */
export async function rollbackSnapshot(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  vmid: number,
  snapname: string,
  type: VMType = 'qemu'
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Rolling back to snapshot', { node, vmid, snapname, type });

  try {
    const result = await client.post<string>(
      `/nodes/${node}/${type}/${vmid}/snapshot/${snapname}/rollback`
    );

    let output = `⏪ **Rolling Back VM ${vmid} to Snapshot**\n\n`;
    output += indentedBullet(`Node: ${node}`, 0);
    output += indentedBullet(`VM ID: ${vmid}`, 0);
    output += indentedBullet(`Type: ${type.toUpperCase()}`, 0);
    output += indentedBullet(`Snapshot: ${snapname}`, 0);
    output += indentedBullet(`Task ID: ${result || 'N/A'}`, 0);
    output += '\n*VM is being restored to snapshot state. Use proxmox_task_status to monitor progress.*\n\n';
    output += '**Warning**: Current VM state will be lost. The VM will be restored to the snapshot state.';

    logger.info('Snapshot rollback initiated', { node, vmid, snapname, taskId: result });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Failed to rollback snapshot', { node, vmid, snapname, error });
    throw error;
  }
}

/**
 * Delete a snapshot
 */
export async function deleteSnapshot(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  vmid: number,
  snapname: string,
  force?: boolean,
  type: VMType = 'qemu'
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Deleting snapshot', { node, vmid, snapname, type, force });

  try {
    const params = force ? { force: 1 } : undefined;
    const result = await client.delete<string>(
      `/nodes/${node}/${type}/${vmid}/snapshot/${snapname}${params ? '?force=1' : ''}`
    );

    let output = `🗑️ **Deleting Snapshot from VM ${vmid}**\n\n`;
    output += indentedBullet(`Node: ${node}`, 0);
    output += indentedBullet(`VM ID: ${vmid}`, 0);
    output += indentedBullet(`Type: ${type.toUpperCase()}`, 0);
    output += indentedBullet(`Snapshot: ${snapname}`, 0);
    if (force) {
      output += indentedBullet(`Force: Yes`, 0);
    }
    output += indentedBullet(`Task ID: ${result || 'N/A'}`, 0);
    output += '\n*Snapshot is being deleted. Use proxmox_task_status to monitor progress.*';

    logger.info('Snapshot deletion initiated', { node, vmid, snapname, taskId: result });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Failed to delete snapshot', { node, vmid, snapname, error });
    throw error;
  }
}

/**
 * Get snapshot configuration
 */
export async function getSnapshotConfig(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  vmid: number,
  snapname: string,
  type: VMType = 'qemu'
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Getting snapshot config', { node, vmid, snapname, type });

  try {
    const config = await client.get<any>(
      `/nodes/${node}/${type}/${vmid}/snapshot/${snapname}/config`
    );

    let output = sectionHeader(`Snapshot Config: ${snapname}`, '⚙️') + '\n\n';
    output += `**VM ID**: ${vmid}\n`;
    output += `**Node**: ${node}\n\n`;

    output += '**Configuration**:\n';
    for (const [key, value] of Object.entries(config)) {
      if (key !== 'digest') {
        output += indentedBullet(`${key}: ${value}`);
      }
    }

    logger.info('Snapshot config retrieved', { node, vmid, snapname });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Failed to get snapshot config', { node, vmid, snapname, error });
    throw error;
  }
}
