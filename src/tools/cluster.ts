/**
 * Cluster management tools
 * Tools for monitoring overall cluster health and status
 */

import { ProxmoxClient } from '../proxmox-client.js';
import { ProxmoxNode, ProxmoxConfig } from '../types.js';
import {
  formatBytes,
  formatPercentage,
  getStatusEmoji,
  sectionHeader,
  indentedBullet,
} from '../formatters.js';
import { createLogger } from '../logger.js';

const logger = createLogger('ClusterTools');

/**
 * Get overall cluster status
 */
export async function getClusterStatus(
  client: ProxmoxClient,
  config: ProxmoxConfig
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Getting cluster status');

  try {
    const nodes = await client.get<ProxmoxNode[]>('/nodes');

    let output = sectionHeader('Proxmox Cluster Status', '🏗️') + '\n\n';

    // Calculate cluster health
    const onlineNodes = nodes.filter((n) => n.status === 'online').length;
    const totalNodes = nodes.length;
    const healthEmoji = onlineNodes === totalNodes ? '🟢' : '🟡';

    output += `**Cluster Health**: ${healthEmoji} ${onlineNodes === totalNodes ? 'Healthy' : 'Warning'}\n`;
    output += `**Nodes**: ${onlineNodes}/${totalNodes} online\n\n`;

    if (config.allowElevated) {
      // Resource summary (only available with elevated permissions)
      let totalCpu = 0;
      let usedCpu = 0;
      let totalMem = 0;
      let usedMem = 0;

      for (const node of nodes) {
        if (node.status === 'online') {
          totalCpu += node.maxcpu || 0;
          usedCpu += (node.cpu || 0) * (node.maxcpu || 0);
          totalMem += node.maxmem || 0;
          usedMem += node.mem || 0;
        }
      }

      const cpuPercent =
        totalCpu > 0 ? formatPercentage(usedCpu / totalCpu) : 'N/A';
      const memPercent =
        totalMem > 0 ? formatPercentage(usedMem / totalMem) : 'N/A';

      output += '**Resource Usage**:\n';
      output += indentedBullet(
        `CPU: ${cpuPercent} (${usedCpu.toFixed(1)}/${totalCpu} cores)`,
        0
      );
      output += indentedBullet(
        `Memory: ${memPercent} (${formatBytes(usedMem)}/${formatBytes(totalMem)})`,
        0
      );
      output += '\n';
    } else {
      output += '⚠️  **Limited Information**: Resource usage requires elevated permissions\n\n';
    }

    // Node details
    output += '**Node Details**:\n';
    for (const node of nodes.sort((a, b) => a.node.localeCompare(b.node))) {
      const status = getStatusEmoji(node.status);
      output += `${status} ${node.node} - ${node.status}\n`;
    }

    logger.info('Cluster status retrieved', { totalNodes, onlineNodes });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Failed to get cluster status', { error });

    return {
      content: [
        {
          type: 'text',
          text:
            '❌ **Failed to get cluster status**\n\n' +
            `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
}
