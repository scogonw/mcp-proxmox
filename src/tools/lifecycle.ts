/**
 * VM Lifecycle Management Tools
 * Control VM/container power states and operations
 */

import { ProxmoxClient } from '../proxmox-client.js';
import { ProxmoxConfig, VMType } from '../types.js';
import { createLogger } from '../logger.js';

const logger = createLogger('LifecycleTools');

/**
 * Start a VM or container
 */
export async function startVM(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  vmid: number,
  type: VMType = 'qemu'
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Starting VM', { node, vmid, type });

  try {
    const result = await client.post<string>(
      `/nodes/${node}/${type}/${vmid}/status/start`
    );

    let output = `✅ **VM ${vmid} Start Command Sent**\n\n`;
    output += `• **Node**: ${node}\n`;
    output += `• **VM ID**: ${vmid}\n`;
    output += `• **Type**: ${type.toUpperCase()}\n`;
    output += `• **Task ID**: ${result || 'N/A'}\n\n`;
    output += '*The VM is starting. Use proxmox_task_status to monitor progress.*';

    logger.info('VM start command sent', { node, vmid, taskId: result });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Failed to start VM', { node, vmid, error });
    throw error;
  }
}

/**
 * Stop a VM or container (forced)
 */
export async function stopVM(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  vmid: number,
  type: VMType = 'qemu'
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Stopping VM (forced)', { node, vmid, type });

  try {
    const result = await client.post<string>(
      `/nodes/${node}/${type}/${vmid}/status/stop`
    );

    let output = `⛔ **VM ${vmid} Stop Command Sent (Forced)**\n\n`;
    output += `• **Node**: ${node}\n`;
    output += `• **VM ID**: ${vmid}\n`;
    output += `• **Type**: ${type.toUpperCase()}\n`;
    output += `• **Task ID**: ${result || 'N/A'}\n\n`;
    output += '*The VM is being stopped forcefully. Use proxmox_task_status to monitor progress.*\n\n';
    output += '**Note**: This is a forced stop. For graceful shutdown, use proxmox_vm_shutdown.';

    logger.info('VM stop command sent', { node, vmid, taskId: result });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Failed to stop VM', { node, vmid, error });
    throw error;
  }
}

/**
 * Shutdown a VM or container (graceful)
 */
export async function shutdownVM(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  vmid: number,
  type: VMType = 'qemu',
  timeout?: number
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Shutting down VM (graceful)', { node, vmid, type, timeout });

  try {
    const params = timeout ? { timeout } : undefined;
    const result = await client.post<string>(
      `/nodes/${node}/${type}/${vmid}/status/shutdown`,
      params
    );

    let output = `🔽 **VM ${vmid} Shutdown Command Sent (Graceful)**\n\n`;
    output += `• **Node**: ${node}\n`;
    output += `• **VM ID**: ${vmid}\n`;
    output += `• **Type**: ${type.toUpperCase()}\n`;
    if (timeout) {
      output += `• **Timeout**: ${timeout} seconds\n`;
    }
    output += `• **Task ID**: ${result || 'N/A'}\n\n`;
    output += '*The VM is shutting down gracefully. Use proxmox_task_status to monitor progress.*\n\n';
    output += '**Note**: This sends ACPI shutdown signal. The guest OS must support ACPI.';

    logger.info('VM shutdown command sent', { node, vmid, taskId: result });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Failed to shutdown VM', { node, vmid, error });
    throw error;
  }
}

/**
 * Reboot a VM or container
 */
export async function rebootVM(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  vmid: number,
  type: VMType = 'qemu'
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Rebooting VM', { node, vmid, type });

  try {
    const result = await client.post<string>(
      `/nodes/${node}/${type}/${vmid}/status/reboot`
    );

    let output = `🔄 **VM ${vmid} Reboot Command Sent**\n\n`;
    output += `• **Node**: ${node}\n`;
    output += `• **VM ID**: ${vmid}\n`;
    output += `• **Type**: ${type.toUpperCase()}\n`;
    output += `• **Task ID**: ${result || 'N/A'}\n\n`;
    output += '*The VM is rebooting. Use proxmox_task_status to monitor progress.*';

    logger.info('VM reboot command sent', { node, vmid, taskId: result });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Failed to reboot VM', { node, vmid, error });
    throw error;
  }
}

/**
 * Suspend a VM (QEMU only)
 */
export async function suspendVM(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  vmid: number
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Suspending VM', { node, vmid });

  try {
    const result = await client.post<string>(
      `/nodes/${node}/qemu/${vmid}/status/suspend`
    );

    let output = `⏸️ **VM ${vmid} Suspend Command Sent**\n\n`;
    output += `• **Node**: ${node}\n`;
    output += `• **VM ID**: ${vmid}\n`;
    output += `• **Type**: QEMU\n`;
    output += `• **Task ID**: ${result || 'N/A'}\n\n`;
    output += '*The VM is being suspended to disk. Use proxmox_vm_resume to resume.*\n\n';
    output += '**Note**: Suspend is only available for QEMU VMs, not LXC containers.';

    logger.info('VM suspend command sent', { node, vmid, taskId: result });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Failed to suspend VM', { node, vmid, error });
    throw error;
  }
}

/**
 * Resume a suspended VM (QEMU only)
 */
export async function resumeVM(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  vmid: number
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Resuming VM', { node, vmid });

  try {
    const result = await client.post<string>(
      `/nodes/${node}/qemu/${vmid}/status/resume`
    );

    let output = `▶️ **VM ${vmid} Resume Command Sent**\n\n`;
    output += `• **Node**: ${node}\n`;
    output += `• **VM ID**: ${vmid}\n`;
    output += `• **Type**: QEMU\n`;
    output += `• **Task ID**: ${result || 'N/A'}\n\n`;
    output += '*The VM is resuming from suspended state. Use proxmox_task_status to monitor progress.*';

    logger.info('VM resume command sent', { node, vmid, taskId: result });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Failed to resume VM', { node, vmid, error });
    throw error;
  }
}

/**
 * Reset a VM (QEMU only - hard reset)
 */
export async function resetVM(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  vmid: number
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Resetting VM', { node, vmid });

  try {
    const result = await client.post<string>(
      `/nodes/${node}/qemu/${vmid}/status/reset`
    );

    let output = `🔌 **VM ${vmid} Reset Command Sent (Hard Reset)**\n\n`;
    output += `• **Node**: ${node}\n`;
    output += `• **VM ID**: ${vmid}\n`;
    output += `• **Type**: QEMU\n`;
    output += `• **Task ID**: ${result || 'N/A'}\n\n`;
    output += `*The VM is being reset (equivalent to pressing reset button).*\n\n`;
    output += `**Warning**: This is a hard reset and may cause data corruption. Use reboot for graceful restart.`;

    logger.info('VM reset command sent', { node, vmid, taskId: result });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Failed to reset VM', { node, vmid, error });
    throw error;
  }
}
