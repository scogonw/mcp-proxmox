/**
 * VM Migration Tools
 * Tools for migrating VMs between nodes in a cluster
 */

import { ProxmoxClient } from '../proxmox-client.js';
import { ProxmoxConfig } from '../types.js';
import { createLogger } from '../logger.js';
import { indentedBullet } from '../formatters.js';

const logger = createLogger('MigrationTools');

/**
 * Check if VM can be migrated to target node
 */
export async function checkMigration(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  vmid: number,
  target: string
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Checking migration prerequisites', { node, vmid, target });

  try {
    const result = await client.get<any>(
      `/nodes/${node}/qemu/${vmid}/migrate?target=${target}`
    );

    let output = `🔍 **Migration Check for VM ${vmid}**\n\n`;
    output += indentedBullet(`Source Node: ${node}`, 0);
    output += indentedBullet(`Target Node: ${target}`, 0);
    output += indentedBullet(`VM ID: ${vmid}`, 0);
    output += '\n';

    if (result.running) {
      output += '**Status**: ✅ VM is running - live migration possible\n\n';
    } else {
      output += '**Status**: ⚠️ VM is stopped - offline migration only\n\n';
    }

    if (result.allowed_nodes && result.allowed_nodes.length > 0) {
      output += '**Allowed Target Nodes**:\n';
      for (const allowedNode of result.allowed_nodes) {
        output += indentedBullet(`✅ ${allowedNode}`);
      }
      output += '\n';
    }

    if (result.local_disks && result.local_disks.length > 0) {
      output += '**Local Disks** (require storage migration):\n';
      for (const disk of result.local_disks) {
        output += indentedBullet(`💿 ${disk}`);
      }
      output += '\n';
    }

    if (result.local_resources && result.local_resources.length > 0) {
      output += '**Local Resources** (migration constraints):\n';
      for (const resource of result.local_resources) {
        output += indentedBullet(`⚠️ ${resource}`);
      }
      output += '\n';
    }

    output += '**Migration Types**:\n';
    output += indentedBullet(`Online: Live migration with minimal downtime`);
    output += indentedBullet(`Offline: VM stopped, moved, then started on target`);
    output += '\n';
    output += '*Use proxmox_vm_migrate to perform the actual migration.*';

    logger.info('Migration check complete', { node, vmid, target, canMigrate: true });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Migration check failed', { node, vmid, target, error });
    throw error;
  }
}

/**
 * Migrate VM to another node
 */
export async function migrateVM(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  vmid: number,
  target: string,
  online?: boolean,
  withLocalDisks?: boolean
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Migrating VM', { node, vmid, target, online, withLocalDisks });

  try {
    const params: any = { target };
    if (online !== undefined) params.online = online ? 1 : 0;
    if (withLocalDisks !== undefined) params['with-local-disks'] = withLocalDisks ? 1 : 0;

    const result = await client.post<string>(
      `/nodes/${node}/qemu/${vmid}/migrate`,
      params
    );

    let output = `🚚 **VM Migration Started**\n\n`;
    output += indentedBullet(`Source Node: ${node}`, 0);
    output += indentedBullet(`Target Node: ${target}`, 0);
    output += indentedBullet(`VM ID: ${vmid}`, 0);
    output += indentedBullet(`Migration Type: ${online ? 'Online (Live)' : 'Offline'}`, 0);
    if (withLocalDisks) {
      output += indentedBullet(`Local Disks: Will be migrated`, 0);
    }
    output += indentedBullet(`Task ID: ${result || 'N/A'}`, 0);
    output += '\n*VM migration is in progress. Use proxmox_task_status to monitor.*\n\n';

    output += '**What happens during migration**:\n';
    if (online) {
      output += indentedBullet(`1. VM memory is transferred to target node`);
      output += indentedBullet(`2. VM continues running with minimal downtime`);
      output += indentedBullet(`3. Final synchronization and switchover`);
      output += indentedBullet(`4. VM now runs on target node`);
    } else {
      output += indentedBullet(`1. VM is stopped on source node`);
      output += indentedBullet(`2. VM configuration is copied to target`);
      if (withLocalDisks) {
        output += indentedBullet(`3. Local disks are transferred`);
      }
      output += indentedBullet(`4. VM can be started on target node`);
    }

    output += '\n';
    output += '**Note**: Online migration may take several minutes for VMs with large memory.';

    logger.info('VM migration initiated', { node, vmid, target, taskId: result });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Failed to migrate VM', { node, vmid, target, error });
    throw error;
  }
}
