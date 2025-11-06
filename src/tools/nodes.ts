/**
 * Node management tools
 * Tools for listing and managing Proxmox cluster nodes
 */

import { ProxmoxClient } from '../proxmox-client.js';
import { ProxmoxNode, ProxmoxConfig } from '../types.js';
import { formatUptime, formatCpu, formatMemory, formatLoadAverage, getStatusEmoji, sectionHeader, indentedBullet } from '../formatters.js';
import { createLogger } from '../logger.js';

const logger = createLogger('NodeTools');

/**
 * Get all cluster nodes
 */
export async function getNodes(
  client: ProxmoxClient,
  _config: ProxmoxConfig
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Getting cluster nodes');

  const nodes = await client.get<ProxmoxNode[]>('/nodes');

  let output = sectionHeader('Proxmox Cluster Nodes', '🖥️') + '\n\n';

  if (nodes.length === 0) {
    output += 'No nodes found in cluster.\n';
  } else {
    for (const node of nodes) {
      const status = getStatusEmoji(node.status);
      const uptime = formatUptime(node.uptime || 0);
      const cpuUsage = formatCpu(node.cpu);
      const memUsage = formatMemory(node.mem, node.maxmem);
      const loadAvg = formatLoadAverage(node.loadavg);

      output += `${status} **${node.node}**\n`;
      output += indentedBullet(`Status: ${node.status}`);
      output += indentedBullet(`Uptime: ${uptime}`);
      output += indentedBullet(`CPU: ${cpuUsage}`);
      output += indentedBullet(`Memory: ${memUsage}`);
      output += indentedBullet(`Load: ${loadAvg}`);
      output += '\n';
    }
  }

  logger.info(`Retrieved ${nodes.length} nodes`);

  return {
    content: [{ type: 'text', text: output }],
  };
}

/**
 * Get detailed status for a specific node
 */
export async function getNodeStatus(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Getting node status', { node });

  if (!_config.allowElevated) {
    return {
      content: [
        {
          type: 'text',
          text:
            '⚠️  **Node Status Requires Elevated Permissions**\n\n' +
            'To view detailed node status, set `PROXMOX_ALLOW_ELEVATED=true` in your .env file ' +
            'and ensure your API token has Sys.Audit permissions.\n\n' +
            '**Current permissions**: Basic (node listing only)',
        },
      ],
    };
  }

  const status = await client.get<any>(`/nodes/${node}/status`);

  const statusEmoji = status.uptime ? '🟢 Online' : '🔴 Offline';

  let output = sectionHeader(`Node ${node} Status`, '🖥️') + '\n\n';
  output += indentedBullet(`Status: ${statusEmoji}`, 0);
  output += indentedBullet(`Uptime: ${status.uptime ? formatUptime(status.uptime) : 'N/A'}`, 0);
  output += indentedBullet(`Load Average: ${formatLoadAverage(status.loadavg)}`, 0);
  output += indentedBullet(`CPU Usage: ${formatCpu(status.cpu)}`, 0);

  if (status.memory) {
    output += indentedBullet(
      `Memory: ${formatMemory(status.memory.used, status.memory.total)}`,
      0
    );
  }

  if (status.rootfs) {
    output += indentedBullet(
      `Root Disk: ${formatMemory(status.rootfs.used, status.rootfs.total)}`,
      0
    );
  }

  if (status.swap) {
    output += indentedBullet(
      `Swap: ${formatMemory(status.swap.used, status.swap.total)}`,
      0
    );
  }

  logger.info('Node status retrieved', { node });

  return {
    content: [{ type: 'text', text: output }],
  };
}
