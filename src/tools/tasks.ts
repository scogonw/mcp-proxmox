/**
 * Task Monitoring Tools
 * Monitor and manage Proxmox asynchronous tasks
 */

import { ProxmoxClient } from '../proxmox-client.js';
import { ProxmoxConfig } from '../types.js';
import { createLogger } from '../logger.js';
import { indentedBullet, sectionHeader, formatUptime } from '../formatters.js';

const logger = createLogger('TaskTools');

interface Task {
  upid: string;
  type: string;
  status?: string;
  exitstatus?: string;
  user: string;
  node: string;
  pid: number;
  pstart: number;
  starttime: number;
  endtime?: number;
  id?: string;
}

interface TaskStatus {
  status: string;
  exitstatus?: string;
  type: string;
  user: string;
  upid: string;
  pid: number;
  pstart: number;
  starttime: number;
  node: string;
  id?: string;
}

interface TaskLog {
  n: number;
  t: string;
}

/**
 * List tasks on a node
 */
export async function listTasks(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  limit?: number,
  running?: boolean,
  errors?: boolean
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Listing tasks', { node, limit, running, errors });

  try {
    // Build query parameters
    const params: string[] = [];
    if (limit) params.push(`limit=${limit}`);
    if (running !== undefined) params.push(`running=${running ? 1 : 0}`);
    if (errors !== undefined) params.push(`errors=${errors ? 1 : 0}`);

    const query = params.length > 0 ? `?${params.join('&')}` : '';

    const tasks = await client.get<Task[]>(`/nodes/${node}/tasks${query}`);

    let output = sectionHeader(`Tasks on Node ${node}`, '📋') + '\n\n';

    if (!tasks || tasks.length === 0) {
      output += 'No tasks found.\n';
    } else {
      output += `**Total Tasks**: ${tasks.length}\n\n`;

      for (const task of tasks.slice(0, limit || 20)) {
        const statusEmoji = task.status === 'running' ? '🔄' :
                           task.exitstatus === 'OK' ? '✅' : '❌';
        const startDate = new Date(task.starttime * 1000).toLocaleString();
        const duration = task.endtime
          ? formatUptime(task.endtime - task.starttime)
          : formatUptime(Date.now() / 1000 - task.starttime);

        output += `${statusEmoji} **${task.type}** (PID: ${task.pid})\n`;
        output += indentedBullet(`User: ${task.user}`);
        output += indentedBullet(`Status: ${task.status || 'N/A'}`);
        if (task.exitstatus) {
          output += indentedBullet(`Exit Status: ${task.exitstatus}`);
        }
        output += indentedBullet(`Started: ${startDate}`);
        output += indentedBullet(`Duration: ${duration}`);
        if (task.id) {
          output += indentedBullet(`VM ID: ${task.id}`);
        }
        output += indentedBullet(`UPID: \`${task.upid}\``);
        output += '\n';
      }

      output += '\n*Use proxmox_task_status with UPID to get detailed status and logs.*';
    }

    logger.info(`Retrieved ${tasks.length} tasks`, { node });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Failed to list tasks', { node, error });
    throw error;
  }
}

/**
 * Get detailed task status
 */
export async function getTaskStatus(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  upid: string,
  includeLogs?: boolean
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Getting task status', { node, upid, includeLogs });

  try {
    const status = await client.get<TaskStatus>(
      `/nodes/${node}/tasks/${encodeURIComponent(upid)}/status`
    );

    const statusEmoji = status.status === 'running' ? '🔄' :
                       status.exitstatus === 'OK' ? '✅' : '❌';

    let output = `${statusEmoji} **Task Status**\n\n`;
    output += indentedBullet(`Type: ${status.type}`, 0);
    output += indentedBullet(`Status: ${status.status}`, 0);

    if (status.exitstatus) {
      output += indentedBullet(`Exit Status: ${status.exitstatus}`, 0);
    }

    output += indentedBullet(`User: ${status.user}`, 0);
    output += indentedBullet(`Node: ${status.node}`, 0);
    output += indentedBullet(`PID: ${status.pid}`, 0);

    const startDate = new Date(status.starttime * 1000).toLocaleString();
    output += indentedBullet(`Started: ${startDate}`, 0);

    if (status.id) {
      output += indentedBullet(`VM ID: ${status.id}`, 0);
    }

    // Get logs if requested and task is not running
    if (includeLogs && status.status !== 'running') {
      try {
        const logs = await client.get<TaskLog[]>(
          `/nodes/${node}/tasks/${encodeURIComponent(upid)}/log`
        );

        if (logs && logs.length > 0) {
          output += '\n\n**Task Logs**:\n```\n';
          for (const log of logs.slice(-50)) {  // Last 50 lines
            output += `${log.t}\n`;
          }
          output += '```';
        }
      } catch (logError) {
        logger.warn('Failed to fetch task logs', { node, upid, error: logError });
      }
    }

    logger.info('Task status retrieved', { node, upid, status: status.status });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Failed to get task status', { node, upid, error });
    throw error;
  }
}

/**
 * Get task logs
 */
export async function getTaskLog(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  upid: string,
  start?: number,
  limit?: number
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Getting task log', { node, upid, start, limit });

  try {
    const params: string[] = [];
    if (start) params.push(`start=${start}`);
    if (limit) params.push(`limit=${limit}`);

    const query = params.length > 0 ? `?${params.join('&')}` : '';

    const logs = await client.get<TaskLog[]>(
      `/nodes/${node}/tasks/${encodeURIComponent(upid)}/log${query}`
    );

    let output = sectionHeader('Task Logs', '📄') + '\n\n';
    output += `**UPID**: \`${upid}\`\n`;
    output += `**Node**: ${node}\n\n`;

    if (!logs || logs.length === 0) {
      output += 'No logs available yet.\n';
    } else {
      output += '```\n';
      for (const log of logs) {
        output += `${log.t}\n`;
      }
      output += '```\n\n';
      output += `*Showing ${logs.length} log lines.*`;
    }

    logger.info(`Retrieved ${logs.length} log lines`, { node, upid });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Failed to get task log', { node, upid, error });
    throw error;
  }
}

/**
 * Stop a running task
 */
export async function stopTask(
  client: ProxmoxClient,
  _config: ProxmoxConfig,
  node: string,
  upid: string
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('Stopping task', { node, upid });

  try {
    await client.delete<string>(
      `/nodes/${node}/tasks/${encodeURIComponent(upid)}`
    );

    let output = `⛔ **Task Stop Signal Sent**\n\n`;
    output += indentedBullet(`Node: ${node}`, 0);
    output += indentedBullet(`UPID: \`${upid}\``, 0);
    output += '\n*Stop signal sent to the task. The task should terminate shortly.*\n\n';
    output += '**Note**: Not all tasks can be stopped gracefully.';

    logger.info('Task stop signal sent', { node, upid });

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    logger.error('Failed to stop task', { node, upid, error });
    throw error;
  }
}

/**
 * Wait for task completion (helper for monitoring)
 */
export async function waitForTask(
  client: ProxmoxClient,
  node: string,
  upid: string,
  maxWaitSeconds: number = 60
): Promise<TaskStatus> {
  const startTime = Date.now();

  while (true) {
    const status = await client.get<TaskStatus>(
      `/nodes/${node}/tasks/${encodeURIComponent(upid)}/status`
    );

    if (status.status !== 'running') {
      return status;
    }

    const elapsed = (Date.now() - startTime) / 1000;
    if (elapsed > maxWaitSeconds) {
      throw new Error(`Task did not complete within ${maxWaitSeconds} seconds`);
    }

    // Wait 2 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}
