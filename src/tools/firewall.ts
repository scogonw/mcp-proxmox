/**
 * Firewall Management Tools
 * Tools for managing Proxmox firewall rules
 */

import { ProxmoxClient } from '../proxmox-client.js';
import { ProxmoxConfig, VMType } from '../types.js';
import { createLogger } from '../logger.js';
import { indentedBullet, sectionHeader } from '../formatters.js';

const logger = createLogger('FirewallTools');

interface FirewallRule {
  pos: number;
  type: string;
  action: string;
  enable?: number;
  iface?: string;
  source?: string;
  dest?: string;
  proto?: string;
  dport?: string;
  sport?: string;
  comment?: string;
  macro?: string;
}

/**
 * List firewall rules for a VM
 */
export async function listFirewallRules(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  vmid: number,
  type: VMType = 'qemu'
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Listing firewall rules', { node, vmid, type });

  try {
    const rules = await client.get<FirewallRule[]>(
      `/nodes/${node}/${type}/${vmid}/firewall/rules`
    );

    let output = sectionHeader(`Firewall Rules for VM ${vmid}`, '🛡️') + '\n\n';
    output += `**Node**: ${node}\n`;
    output += `**VM ID**: ${vmid}\n`;
    output += `**Type**: ${type.toUpperCase()}\n\n`;

    if (!rules || rules.length === 0) {
      output += 'No firewall rules configured.\n\n';
      output += '*Use proxmox_firewall_rule_create to add rules.*';
    } else {
      output += `**Total Rules**: ${rules.length}\n\n`;

      for (const rule of rules) {
        const enabled = rule.enable === 1 ? '✅' : '❌';
        const action = rule.action === 'ACCEPT' ? '✅ ACCEPT' : '❌ DROP/REJECT';

        output += `${enabled} **Rule ${rule.pos}** - ${action}\n`;
        output += indentedBullet(`Type: ${rule.type}`);

        if (rule.macro) {
          output += indentedBullet(`Macro: ${rule.macro}`);
        }
        if (rule.iface) {
          output += indentedBullet(`Interface: ${rule.iface}`);
        }
        if (rule.source) {
          output += indentedBullet(`Source: ${rule.source}`);
        }
        if (rule.dest) {
          output += indentedBullet(`Destination: ${rule.dest}`);
        }
        if (rule.proto) {
          output += indentedBullet(`Protocol: ${rule.proto}`);
        }
        if (rule.dport) {
          output += indentedBullet(`Dest Port: ${rule.dport}`);
        }
        if (rule.sport) {
          output += indentedBullet(`Source Port: ${rule.sport}`);
        }
        if (rule.comment) {
          output += indentedBullet(`Comment: ${rule.comment}`);
        }
        output += '\n';
      }

      output += '*Rules are processed in order from top to bottom.*';
    }

    logger.info(`Retrieved ${rules.length} firewall rules`, { node, vmid });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Failed to list firewall rules', { node, vmid, error });
    throw error;
  }
}

/**
 * Create a new firewall rule
 */
export async function createFirewallRule(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  vmid: number,
  action: 'ACCEPT' | 'DROP' | 'REJECT',
  ruleType: 'in' | 'out',
  enable?: boolean,
  proto?: string,
  dport?: string,
  source?: string,
  dest?: string,
  comment?: string,
  type: VMType = 'qemu'
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Creating firewall rule', {
    node,
    vmid,
    action,
    ruleType,
    proto,
    dport,
    type,
  });

  try {
    const params: any = {
      action,
      type: ruleType,
    };

    if (enable !== undefined) params.enable = enable ? 1 : 0;
    if (proto) params.proto = proto;
    if (dport) params.dport = dport;
    if (source) params.source = source;
    if (dest) params.dest = dest;
    if (comment) params.comment = comment;

    await client.post<string>(
      `/nodes/${node}/${type}/${vmid}/firewall/rules`,
      params
    );

    let output = `🛡️ **Firewall Rule Created for VM ${vmid}**\n\n`;
    output += indentedBullet(`Node: ${node}`, 0);
    output += indentedBullet(`VM ID: ${vmid}`, 0);
    output += indentedBullet(`Direction: ${ruleType === 'in' ? 'Inbound' : 'Outbound'}`, 0);
    output += indentedBullet(`Action: ${action}`, 0);
    output += indentedBullet(`Enabled: ${enable !== false ? 'Yes' : 'No'}`, 0);

    if (proto) output += indentedBullet(`Protocol: ${proto}`, 0);
    if (dport) output += indentedBullet(`Destination Port: ${dport}`, 0);
    if (source) output += indentedBullet(`Source: ${source}`, 0);
    if (dest) output += indentedBullet(`Destination: ${dest}`, 0);
    if (comment) output += indentedBullet(`Comment: ${comment}`, 0);

    output += '\n*Firewall rule has been added successfully.*\n\n';
    output += '**Rule Examples**:\n';
    output += indentedBullet(`Allow SSH: action=ACCEPT, proto=tcp, dport=22`);
    output += indentedBullet(`Block IP: action=DROP, source=x.x.x.x`);
    output += indentedBullet(`Allow HTTP/S: action=ACCEPT, proto=tcp, dport=80,443`);

    logger.info('Firewall rule created', { node, vmid, action, ruleType });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Failed to create firewall rule', { node, vmid, error });
    throw error;
  }
}

/**
 * Delete a firewall rule
 */
export async function deleteFirewallRule(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  vmid: number,
  pos: number,
  type: VMType = 'qemu'
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Deleting firewall rule', { node, vmid, pos, type });

  try {
    await client.delete<string>(
      `/nodes/${node}/${type}/${vmid}/firewall/rules/${pos}`
    );

    let output = `🗑️ **Firewall Rule Deleted**\n\n`;
    output += indentedBullet(`Node: ${node}`, 0);
    output += indentedBullet(`VM ID: ${vmid}`, 0);
    output += indentedBullet(`Rule Position: ${pos}`, 0);
    output += '\n*Firewall rule has been removed.*\n\n';
    output += '**Note**: Rule positions will be automatically renumbered.';

    logger.info('Firewall rule deleted', { node, vmid, pos });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Failed to delete firewall rule', { node, vmid, pos, error });
    throw error;
  }
}

/**
 * Get firewall options for a VM
 */
export async function getFirewallOptions(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  vmid: number,
  type: VMType = 'qemu'
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Getting firewall options', { node, vmid, type });

  try {
    const options = await client.get<any>(
      `/nodes/${node}/${type}/${vmid}/firewall/options`
    );

    let output = sectionHeader(`Firewall Options for VM ${vmid}`, '🛡️') + '\n\n';
    output += `**Node**: ${node}\n`;
    output += `**VM ID**: ${vmid}\n\n`;

    output += '**Configuration**:\n';
    for (const [key, value] of Object.entries(options)) {
      if (key !== 'digest') {
        output += indentedBullet(`${key}: ${value}`);
      }
    }

    logger.info('Firewall options retrieved', { node, vmid });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Failed to get firewall options', { node, vmid, error });
    throw error;
  }
}
