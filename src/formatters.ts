/**
 * Utility functions for formatting output data
 * Provides consistent formatting across all tools
 */

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format uptime in seconds to human-readable string
 */
export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0 || parts.length === 0) {
    parts.push(`${minutes}m`);
  }

  return parts.join(' ');
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format CPU usage
 */
export function formatCpu(cpu: number | undefined): string {
  if (cpu === undefined || cpu === null) return 'N/A';
  return formatPercentage(cpu);
}

/**
 * Format memory usage
 */
export function formatMemory(
  used: number | undefined,
  total: number | undefined
): string {
  if (!used || !total) return 'N/A';

  const usedStr = formatBytes(used);
  const totalStr = formatBytes(total);
  const percentage = formatPercentage(used / total);

  return `${usedStr} / ${totalStr} (${percentage})`;
}

/**
 * Format disk usage
 */
export function formatDisk(
  used: number | undefined,
  total: number | undefined
): string {
  return formatMemory(used, total);
}

/**
 * Format load average
 */
export function formatLoadAverage(loadavg: number[] | undefined): string {
  if (!loadavg || loadavg.length === 0) return 'N/A';

  return loadavg.map((load) => load.toFixed(2)).join(', ');
}

/**
 * Get status emoji
 */
export function getStatusEmoji(
  status: string | undefined
): '🟢' | '🔴' | '🟡' {
  if (!status) return '🟡';

  switch (status.toLowerCase()) {
    case 'online':
    case 'running':
    case 'active':
      return '🟢';
    case 'offline':
    case 'stopped':
    case 'inactive':
      return '🔴';
    default:
      return '🟡';
  }
}

/**
 * Get VM type emoji
 */
export function getVmTypeEmoji(type: string): '🖥️' | '📦' {
  return type === 'qemu' ? '🖥️' : '📦';
}

/**
 * Get enabled/disabled emoji
 */
export function getEnabledEmoji(enabled: boolean | number): '🟢' | '🔴' {
  return enabled ? '🟢' : '🔴';
}

/**
 * Format network traffic
 */
export function formatNetworkTraffic(bytes: number | undefined): string {
  if (!bytes) return 'N/A';
  return formatBytes(bytes);
}

/**
 * Truncate string to maximum length
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Format storage content types
 */
export function formatStorageContent(content: string | undefined): string {
  if (!content) return 'N/A';
  return content
    .split(',')
    .map((c) => c.trim())
    .join(', ');
}

/**
 * Create a markdown table row
 */
export function tableRow(cells: string[]): string {
  return `| ${cells.join(' | ')} |`;
}

/**
 * Create a markdown table header
 */
export function tableHeader(headers: string[]): string {
  const separator = headers.map(() => '---').join(' | ');
  return `${tableRow(headers)}\n| ${separator} |`;
}

/**
 * Format boolean as Yes/No
 */
export function formatBoolean(value: boolean | number | undefined): string {
  if (value === undefined) return 'N/A';
  return value ? 'Yes' : 'No';
}

/**
 * Format timestamp
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

/**
 * Create a section header
 */
export function sectionHeader(title: string, emoji?: string): string {
  return emoji ? `${emoji} **${title}**` : `**${title}**`;
}

/**
 * Create a bullet point
 */
export function bullet(text: string): string {
  return `• ${text}`;
}

/**
 * Create an indented bullet point
 */
export function indentedBullet(text: string, level: number = 1): string {
  const indent = '   '.repeat(level);
  return `${indent}• ${text}`;
}
