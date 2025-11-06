/**
 * VM Cloning and Template Operations
 * Tools for cloning VMs and creating/managing templates
 */

import { ProxmoxClient } from '../proxmox-client.js';
import { ProxmoxConfig, VMType } from '../types.js';
import { createLogger } from '../logger.js';
import { indentedBullet } from '../formatters.js';

const logger = createLogger('CloningTools');

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
