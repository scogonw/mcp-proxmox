/**
 * Virtual machine management tools
 * Tools for listing and managing VMs and containers
 */

import { ProxmoxClient } from '../proxmox-client.js';
import { ProxmoxVM, ProxmoxVMStatus, ProxmoxConfig, VMTypeFilter, VMType } from '../types.js';
import {
  formatUptime,
  formatCpu,
  formatMemory,
  formatNetworkTraffic,
  getStatusEmoji,
  getVmTypeEmoji,
  sectionHeader,
  indentedBullet,
  formatBytes,
} from '../formatters.js';
import { createLogger } from '../logger.js';

const logger = createLogger('VMTools');

/**
 * Get all virtual machines across the cluster
 */
export async function getVMs(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  nodeFilter?: string,
  typeFilter: VMTypeFilter = 'all'
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Getting VMs', { nodeFilter, typeFilter });

  let vms: ProxmoxVM[] = [];

  if (nodeFilter) {
    // Get VMs for specific node
    const qemuVMs = typeFilter === 'all' || typeFilter === 'qemu'
      ? await client.get<ProxmoxVM[]>(`/nodes/${nodeFilter}/qemu`)
      : [];
    const lxcVMs = typeFilter === 'all' || typeFilter === 'lxc'
      ? await client.get<ProxmoxVM[]>(`/nodes/${nodeFilter}/lxc`)
      : [];

    vms = [
      ...qemuVMs.map((vm) => ({ ...vm, type: 'qemu' as VMType, node: nodeFilter })),
      ...lxcVMs.map((vm) => ({ ...vm, type: 'lxc' as VMType, node: nodeFilter })),
    ];
  } else {
    // Get VMs from all nodes
    const nodes = await client.get<{ node: string }[]>('/nodes');

    for (const node of nodes) {
      if (typeFilter === 'all' || typeFilter === 'qemu') {
        const qemuVMs = await client.get<ProxmoxVM[]>(`/nodes/${node.node}/qemu`);
        vms.push(...qemuVMs.map((vm) => ({ ...vm, type: 'qemu' as VMType, node: node.node })));
      }

      if (typeFilter === 'all' || typeFilter === 'lxc') {
        const lxcVMs = await client.get<ProxmoxVM[]>(`/nodes/${node.node}/lxc`);
        vms.push(...lxcVMs.map((vm) => ({ ...vm, type: 'lxc' as VMType, node: node.node })));
      }
    }
  }

  let output = sectionHeader('Virtual Machines', '💻') + '\n\n';

  if (vms.length === 0) {
    output += 'No virtual machines found.\n';
  } else {
    // Sort by VMID
    vms.sort((a, b) => a.vmid - b.vmid);

    for (const vm of vms) {
      const status = getStatusEmoji(vm.status);
      const typeIcon = getVmTypeEmoji(vm.type);
      const uptime = formatUptime(vm.uptime || 0);
      const cpuUsage = formatCpu(vm.cpu);
      const memUsage = formatMemory(vm.mem, vm.maxmem);

      output += `${status} ${typeIcon} **${vm.name || `VM-${vm.vmid}`}** (ID: ${vm.vmid})\n`;
      output += indentedBullet(`Node: ${vm.node}`);
      output += indentedBullet(`Status: ${vm.status}`);
      output += indentedBullet(`Type: ${vm.type.toUpperCase()}`);

      if (vm.status === 'running') {
        output += indentedBullet(`Uptime: ${uptime}`);
        output += indentedBullet(`CPU: ${cpuUsage}`);
        output += indentedBullet(`Memory: ${memUsage}`);
      }

      output += '\n';
    }
  }

  logger.info(`Retrieved ${vms.length} VMs`);

  return {
    content: [{ type: 'text', text: output }],
  };
}

/**
 * Get detailed status for a specific VM
 */
export async function getVMStatus(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  vmid: number,
  type: VMType = 'qemu'
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Getting VM status', { node, vmid, type });

  const vmStatus = await client.get<ProxmoxVMStatus>(
    `/nodes/${node}/${type}/${vmid}/status/current`
  );

  const status = getStatusEmoji(vmStatus.status);
  const typeIcon = getVmTypeEmoji(type);

  let output = `${status} ${typeIcon} **${vmStatus.name || `VM-${vmid}`}** (ID: ${vmid})\n\n`;
  output += indentedBullet(`Node: ${node}`, 0);
  output += indentedBullet(`Status: ${vmStatus.status}`, 0);
  output += indentedBullet(`Type: ${type.toUpperCase()}`, 0);

  if (vmStatus.status === 'running') {
    output += indentedBullet(`Uptime: ${formatUptime(vmStatus.uptime || 0)}`, 0);
    output += indentedBullet(`CPU Usage: ${formatCpu(vmStatus.cpu)}`, 0);
    output += indentedBullet(`Memory: ${formatMemory(vmStatus.mem, vmStatus.maxmem)}`, 0);
    output += indentedBullet(`Disk Read: ${formatBytes(vmStatus.diskread || 0)}`, 0);
    output += indentedBullet(`Disk Write: ${formatBytes(vmStatus.diskwrite || 0)}`, 0);
    output += indentedBullet(`Network In: ${formatNetworkTraffic(vmStatus.netin)}`, 0);
    output += indentedBullet(`Network Out: ${formatNetworkTraffic(vmStatus.netout)}`, 0);
  }

  logger.info('VM status retrieved', { node, vmid, type });

  return {
    content: [{ type: 'text', text: output }],
  };
}

/**
 * Execute command on a VM
 */
export async function executeVMCommand(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  vmid: number,
  command: string,
  type: VMType = 'qemu'
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Executing VM command', { node, vmid, command, type });

  if (!_config.allowElevated) {
    return {
      content: [
        {
          type: 'text',
          text:
            '⚠️  **VM Command Execution Requires Elevated Permissions**\n\n' +
            'To execute commands on VMs, set `PROXMOX_ALLOW_ELEVATED=true` in your .env file ' +
            'and ensure your API token has appropriate VM permissions.\n\n' +
            `**Current permissions**: Basic (VM listing only)\n` +
            `**Requested command**: \`${command}\``,
        },
      ],
    };
  }

  try {
    if (type === 'qemu') {
      // QEMU VMs use guest agent
      const result = await client.post<{ pid: number }>(
        `/nodes/${node}/qemu/${vmid}/agent/exec`,
        { command }
      );

      let output = sectionHeader(`Command executed on VM ${vmid}`, '💻') + '\n\n';
      output += indentedBullet(`Command: \`${command}\``, 0);
      output += indentedBullet(`Result: Command submitted to guest agent`, 0);
      output += indentedBullet(`PID: ${result.pid || 'N/A'}`, 0);
      output += '\n';
      output += '*Note: Use guest agent status to check command completion*';

      logger.info('Command executed on QEMU VM', { node, vmid, pid: result.pid });

      return {
        content: [{ type: 'text', text: output }],
      };
    } else {
      // LXC containers can execute directly
      const result = await client.post<string>(
        `/nodes/${node}/lxc/${vmid}/exec`,
        { command }
      );

      let output = sectionHeader(`Command executed on LXC ${vmid}`, '📦') + '\n\n';
      output += indentedBullet(`Command: \`${command}\``, 0);
      output += indentedBullet(`Output:`, 0);
      output += `\n\`\`\`\n${result || 'Command executed successfully'}\n\`\`\``;

      logger.info('Command executed on LXC container', { node, vmid });

      return {
        content: [{ type: 'text', text: output }],
      };
    }
  } catch (error) {
    logger.error('Failed to execute VM command', { node, vmid, command, error });

    return {
      content: [
        {
          type: 'text',
          text:
            `❌ **Failed to execute command on VM ${vmid}**\n\n` +
            `Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\n` +
            '*Note: Make sure the VM has guest agent installed and running (for QEMU VMs)*',
        },
      ],
    };
  }
}
