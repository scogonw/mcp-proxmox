/**
 * Storage management tools
 * Tools for listing and managing Proxmox storage pools
 */

import { ProxmoxClient } from '../proxmox-client.js';
import { ProxmoxStorage, ProxmoxConfig } from '../types.js';
import {
  formatBytes,
  formatPercentage,
  getEnabledEmoji,
  formatStorageContent,
  sectionHeader,
  indentedBullet,
} from '../formatters.js';
import { createLogger } from '../logger.js';

const logger = createLogger('StorageTools');

/**
 * Get all storage pools
 */
export async function getStorage(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  nodeFilter?: string
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Getting storage pools', { nodeFilter });

  let storages: ProxmoxStorage[] = [];

  if (nodeFilter) {
    // Get storage for specific node
    storages = await client.get<ProxmoxStorage[]>(`/nodes/${nodeFilter}/storage`);
    storages = storages.map((storage) => ({ ...storage, node: nodeFilter }));
  } else {
    // Get storage from all nodes
    const nodes = await client.get<{ node: string }[]>('/nodes');

    for (const node of nodes) {
      const nodeStorages = await client.get<ProxmoxStorage[]>(
        `/nodes/${node.node}/storage`
      );
      storages.push(
        ...nodeStorages.map((storage) => ({ ...storage, node: node.node }))
      );
    }
  }

  let output = sectionHeader('Storage Pools', '💾') + '\n\n';

  if (storages.length === 0) {
    output += 'No storage pools found.\n';
  } else {
    // Deduplicate storage pools (they can appear on multiple nodes)
    const uniqueStorages = new Map<string, ProxmoxStorage>();

    for (const storage of storages) {
      const key = `${storage.storage}-${storage.node}`;
      if (!uniqueStorages.has(key)) {
        uniqueStorages.set(key, storage);
      }
    }

    // Sort by storage name
    const sortedStorages = Array.from(uniqueStorages.values()).sort((a, b) =>
      a.storage.localeCompare(b.storage)
    );

    for (const storage of sortedStorages) {
      const enabled = getEnabledEmoji(storage.enabled || 0);
      const usagePercent =
        storage.total && storage.used
          ? formatPercentage(storage.used / storage.total)
          : 'N/A';

      output += `${enabled} **${storage.storage}**\n`;
      output += indentedBullet(`Node: ${storage.node}`);
      output += indentedBullet(`Type: ${storage.type || 'N/A'}`);
      output += indentedBullet(`Content: ${formatStorageContent(storage.content)}`);

      if (storage.total && storage.used) {
        output += indentedBullet(
          `Usage: ${formatBytes(storage.used)} / ${formatBytes(storage.total)} (${usagePercent})`
        );
      }

      output += indentedBullet(`Status: ${storage.enabled ? 'Enabled' : 'Disabled'}`);
      output += '\n';
    }
  }

  logger.info(`Retrieved ${storages.length} storage pools`);

  return {
    content: [{ type: 'text', text: output }],
  };
}
