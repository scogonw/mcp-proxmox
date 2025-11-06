/**
 * Backup and Restore Operations
 * Tools for backing up and restoring VMs and containers
 */

import { ProxmoxClient } from '../proxmox-client.js';
import { ProxmoxConfig, VMType } from '../types.js';
import { createLogger } from '../logger.js';
import { indentedBullet, sectionHeader, formatBytes, formatTimestamp } from '../formatters.js';

const logger = createLogger('BackupTools');

interface BackupFile {
  volid: string;
  format: string;
  size: number;
  ctime: number;
  vmid?: number;
  content?: string;
  notes?: string;
}

/**
 * Create a backup of a VM or container
 */
export async function createBackup(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  vmid: number,
  storage: string,
  mode?: 'snapshot' | 'suspend' | 'stop',
  compress?: 'none' | 'lzo' | 'gzip' | 'zstd',
  type: VMType = 'qemu'
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Creating backup', { node, vmid, storage, mode, compress, type });

  try {
    const params: any = { storage };
    if (mode) params.mode = mode;
    if (compress) params.compress = compress;

    const result = await client.post<string>(
      `/nodes/${node}/vzdump`,
      { vmid: String(vmid), ...params }
    );

    let output = `💾 **Backup Creation Started for VM ${vmid}**\n\n`;
    output += indentedBullet(`Node: ${node}`, 0);
    output += indentedBullet(`VM ID: ${vmid}`, 0);
    output += indentedBullet(`Type: ${type.toUpperCase()}`, 0);
    output += indentedBullet(`Storage: ${storage}`, 0);
    output += indentedBullet(`Mode: ${mode || 'snapshot'} (default)`, 0);
    output += indentedBullet(`Compression: ${compress || 'lzo'} (default)`, 0);
    output += indentedBullet(`Task ID: ${result || 'N/A'}`, 0);
    output += '\n*Backup is being created. Use proxmox_task_status to monitor progress.*\n\n';

    output += '**Backup Modes**:\n';
    output += indentedBullet(`snapshot: Live backup with minimal downtime (default)`, 0);
    output += indentedBullet(`suspend: Suspend VM during backup for consistency`, 0);
    output += indentedBullet(`stop: Stop VM completely during backup`, 0);

    logger.info('Backup creation initiated', { node, vmid, taskId: result });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Failed to create backup', { node, vmid, error });
    throw error;
  }
}

/**
 * List available backups
 */
export async function listBackups(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  storage: string,
  vmid?: number
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Listing backups', { node, storage, vmid });

  try {
    // Get storage content filtered to backups
    const backups = await client.get<BackupFile[]>(
      `/nodes/${node}/storage/${storage}/content?content=backup`
    );

    let filteredBackups = backups;
    if (vmid) {
      filteredBackups = backups.filter(b => b.vmid === vmid);
    }

    let output = sectionHeader(`Backups on ${storage}`, '💾') + '\n\n';
    output += `**Node**: ${node}\n`;
    output += `**Storage**: ${storage}\n`;
    if (vmid) {
      output += `**Filtered**: VM ${vmid} only\n`;
    }
    output += '\n';

    if (!filteredBackups || filteredBackups.length === 0) {
      output += 'No backups found.\n';
    } else {
      output += `**Total Backups**: ${filteredBackups.length}\n\n`;

      // Sort by creation time (newest first)
      filteredBackups.sort((a, b) => b.ctime - a.ctime);

      for (const backup of filteredBackups) {
        const date = formatTimestamp(backup.ctime);
        const size = formatBytes(backup.size);

        output += `📦 **${backup.volid}**\n`;
        if (backup.vmid) {
          output += indentedBullet(`VM ID: ${backup.vmid}`);
        }
        output += indentedBullet(`Format: ${backup.format || 'N/A'}`);
        output += indentedBullet(`Size: ${size}`);
        output += indentedBullet(`Created: ${date}`);
        if (backup.notes) {
          output += indentedBullet(`Notes: ${backup.notes}`);
        }
        output += '\n';
      }

      output += '\n*Use proxmox_backup_restore to restore from any backup.*';
    }

    logger.info(`Retrieved ${filteredBackups.length} backups`, { node, storage });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Failed to list backups', { node, storage, error });
    throw error;
  }
}

/**
 * Restore VM from backup
 */
export async function restoreBackup(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  storage: string,
  archive: string,
  vmid?: number,
  force?: boolean
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Restoring from backup', { node, storage, archive, vmid, force });

  try {
    const params: any = {
      archive: `${storage}:backup/${archive}`,
    };
    if (vmid) params.vmid = vmid;
    if (force) params.force = 1;

    // Determine VM type from archive name (vzdump-qemu-*.vma.* or vzdump-lxc-*.tar.*)
    const isQemu = archive.includes('qemu');
    const endpoint = isQemu ? '/nodes/${node}/qemu' : `/nodes/${node}/lxc`;

    const result = await client.post<string>(endpoint, params);

    let output = `♻️ **Restoring VM from Backup**\n\n`;
    output += indentedBullet(`Node: ${node}`, 0);
    output += indentedBullet(`Storage: ${storage}`, 0);
    output += indentedBullet(`Archive: ${archive}`, 0);
    if (vmid) {
      output += indentedBullet(`New VM ID: ${vmid}`, 0);
    } else {
      output += indentedBullet(`VM ID: Original from backup`, 0);
    }
    if (force) {
      output += indentedBullet(`Force: Yes (will overwrite existing VM)`, 0);
    }
    output += indentedBullet(`Task ID: ${result || 'N/A'}`, 0);
    output += '\n*VM is being restored. Use proxmox_task_status to monitor progress.*\n\n';
    output += '**Note**: Restore may take several minutes depending on backup size.';

    logger.info('Backup restore initiated', { node, archive, taskId: result });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Failed to restore backup', { node, archive, error });
    throw error;
  }
}

/**
 * Delete a backup file
 */
export async function deleteBackup(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  storage: string,
  volume: string
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Deleting backup', { node, storage, volume });

  try {
    await client.delete<string>(
      `/nodes/${node}/storage/${storage}/content/${encodeURIComponent(volume)}`
    );

    let output = `🗑️ **Backup Deleted**\n\n`;
    output += indentedBullet(`Node: ${node}`, 0);
    output += indentedBullet(`Storage: ${storage}`, 0);
    output += indentedBullet(`Volume: ${volume}`, 0);
    output += '\n*Backup file has been removed from storage.*\n\n';
    output += '**Warning**: This action cannot be undone.';

    logger.info('Backup deleted', { node, storage, volume });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Failed to delete backup', { node, storage, volume, error });
    throw error;
  }
}
