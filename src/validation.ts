/**
 * Input validation schemas using Zod
 * Ensures all tool inputs are properly validated
 */

import { z } from 'zod';

/**
 * Common validation schemas
 */
export const nodeNameSchema = z
  .string()
  .min(1)
  .regex(/^[a-zA-Z0-9\-_.]+$/, 'Invalid node name format');

export const vmidSchema = z.coerce
  .number()
  .int()
  .positive()
  .min(100)
  .max(999999999);

export const vmTypeSchema = z.enum(['qemu', 'lxc']);

export const vmTypeFilterSchema = z.enum(['qemu', 'lxc', 'all']).default('all');

export const commandSchema = z.string().min(1).max(10000);

/**
 * Tool input validation schemas
 */

// proxmox_get_nodes
export const getNodesArgsSchema = z.object({});

// proxmox_get_node_status
export const getNodeStatusArgsSchema = z.object({
  node: nodeNameSchema,
});

// proxmox_get_vms
export const getVmsArgsSchema = z.object({
  node: nodeNameSchema.optional(),
  type: vmTypeFilterSchema.optional(),
});

// proxmox_get_vm_status
export const getVmStatusArgsSchema = z.object({
  node: nodeNameSchema,
  vmid: vmidSchema,
  type: vmTypeSchema.optional().default('qemu'),
});

// proxmox_execute_vm_command
export const executeVmCommandArgsSchema = z.object({
  node: nodeNameSchema,
  vmid: vmidSchema,
  command: commandSchema,
  type: vmTypeSchema.optional().default('qemu'),
});

// proxmox_get_storage
export const getStorageArgsSchema = z.object({
  node: nodeNameSchema.optional(),
});

// proxmox_get_cluster_status
export const getClusterStatusArgsSchema = z.object({});

/**
 * Validate tool arguments
 */
export function validateArgs<T>(
  schema: z.ZodSchema<T>,
  args: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const data = schema.parse(args);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      return { success: false, error: messages };
    }
    return { success: false, error: 'Validation failed' };
  }
}

/**
 * Type-safe argument parser
 */
export class ArgumentValidator {
  static getNodes(args: unknown) {
    return validateArgs(getNodesArgsSchema, args);
  }

  static getNodeStatus(args: unknown) {
    return validateArgs(getNodeStatusArgsSchema, args);
  }

  static getVms(args: unknown) {
    return validateArgs(getVmsArgsSchema, args);
  }

  static getVmStatus(args: unknown) {
    return validateArgs(getVmStatusArgsSchema, args);
  }

  static executeVmCommand(args: unknown) {
    return validateArgs(executeVmCommandArgsSchema, args);
  }

  static getStorage(args: unknown) {
    return validateArgs(getStorageArgsSchema, args);
  }

  static getClusterStatus(args: unknown) {
    return validateArgs(getClusterStatusArgsSchema, args);
  }
}
