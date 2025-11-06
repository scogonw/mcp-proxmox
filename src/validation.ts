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

export const snapnameSchema = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[a-zA-Z0-9_\-]+$/, 'Invalid snapshot name format');

export const upidSchema = z.string().min(1);

export const booleanSchema = z.coerce.boolean().optional();

export const timeoutSchema = z.coerce.number().int().positive().max(3600).optional();

export const limitSchema = z.coerce.number().int().positive().max(1000).optional();

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

// VM Lifecycle operations
export const vmStartArgsSchema = z.object({
  node: nodeNameSchema,
  vmid: vmidSchema,
  type: vmTypeSchema.optional().default('qemu'),
});

export const vmStopArgsSchema = z.object({
  node: nodeNameSchema,
  vmid: vmidSchema,
  type: vmTypeSchema.optional().default('qemu'),
});

export const vmShutdownArgsSchema = z.object({
  node: nodeNameSchema,
  vmid: vmidSchema,
  type: vmTypeSchema.optional().default('qemu'),
  timeout: timeoutSchema,
});

export const vmRebootArgsSchema = z.object({
  node: nodeNameSchema,
  vmid: vmidSchema,
  type: vmTypeSchema.optional().default('qemu'),
});

export const vmSuspendArgsSchema = z.object({
  node: nodeNameSchema,
  vmid: vmidSchema,
});

export const vmResumeArgsSchema = z.object({
  node: nodeNameSchema,
  vmid: vmidSchema,
});

export const vmResetArgsSchema = z.object({
  node: nodeNameSchema,
  vmid: vmidSchema,
});

// Snapshot operations
export const snapshotCreateArgsSchema = z.object({
  node: nodeNameSchema,
  vmid: vmidSchema,
  snapname: snapnameSchema,
  description: z.string().max(500).optional(),
  vmstate: booleanSchema,
  type: vmTypeSchema.optional().default('qemu'),
});

export const snapshotListArgsSchema = z.object({
  node: nodeNameSchema,
  vmid: vmidSchema,
  type: vmTypeSchema.optional().default('qemu'),
});

export const snapshotRollbackArgsSchema = z.object({
  node: nodeNameSchema,
  vmid: vmidSchema,
  snapname: snapnameSchema,
  type: vmTypeSchema.optional().default('qemu'),
});

export const snapshotDeleteArgsSchema = z.object({
  node: nodeNameSchema,
  vmid: vmidSchema,
  snapname: snapnameSchema,
  force: booleanSchema,
  type: vmTypeSchema.optional().default('qemu'),
});

export const snapshotConfigArgsSchema = z.object({
  node: nodeNameSchema,
  vmid: vmidSchema,
  snapname: snapnameSchema,
  type: vmTypeSchema.optional().default('qemu'),
});

// Task operations
export const taskListArgsSchema = z.object({
  node: nodeNameSchema,
  limit: limitSchema,
  running: booleanSchema,
  errors: booleanSchema,
});

export const taskStatusArgsSchema = z.object({
  node: nodeNameSchema,
  upid: upidSchema,
  includeLogs: booleanSchema,
});

export const taskLogArgsSchema = z.object({
  node: nodeNameSchema,
  upid: upidSchema,
  start: z.coerce.number().int().nonnegative().optional(),
  limit: limitSchema,
});

export const taskStopArgsSchema = z.object({
  node: nodeNameSchema,
  upid: upidSchema,
});

// Backup operations
export const backupCreateArgsSchema = z.object({
  node: nodeNameSchema,
  vmid: vmidSchema,
  storage: z.string().min(1),
  mode: z.enum(['snapshot', 'suspend', 'stop']).optional(),
  compress: z.enum(['none', 'lzo', 'gzip', 'zstd']).optional(),
  type: vmTypeSchema.optional().default('qemu'),
});

export const backupListArgsSchema = z.object({
  node: nodeNameSchema,
  storage: z.string().min(1),
  vmid: vmidSchema.optional(),
});

export const backupRestoreArgsSchema = z.object({
  node: nodeNameSchema,
  storage: z.string().min(1),
  archive: z.string().min(1),
  vmid: vmidSchema.optional(),
  force: booleanSchema,
});

export const backupDeleteArgsSchema = z.object({
  node: nodeNameSchema,
  storage: z.string().min(1),
  volume: z.string().min(1),
});

// Cloning operations
export const cloneVMArgsSchema = z.object({
  node: nodeNameSchema,
  vmid: vmidSchema,
  newid: vmidSchema,
  name: z.string().min(1).max(64).optional(),
  description: z.string().max(8192).optional(),
  full: booleanSchema,
  target: nodeNameSchema.optional(),
  type: vmTypeSchema.optional().default('qemu'),
});

export const templateArgsSchema = z.object({
  node: nodeNameSchema,
  vmid: vmidSchema,
  type: vmTypeSchema.optional().default('qemu'),
});

// Resource management
export const vmConfigGetArgsSchema = z.object({
  node: nodeNameSchema,
  vmid: vmidSchema,
  type: vmTypeSchema.optional().default('qemu'),
});

export const vmConfigUpdateArgsSchema = z.object({
  node: nodeNameSchema,
  vmid: vmidSchema,
  config: z.record(z.any()),
  type: vmTypeSchema.optional().default('qemu'),
});

export const diskResizeArgsSchema = z.object({
  node: nodeNameSchema,
  vmid: vmidSchema,
  disk: z.string().min(1).regex(/^(scsi|virtio|ide|sata)\d+$/),
  size: z.string().regex(/^\+?\d+[KMGT]?$/),
  type: vmTypeSchema.optional().default('qemu'),
});

// Migration operations
export const migrationCheckArgsSchema = z.object({
  node: nodeNameSchema,
  vmid: vmidSchema,
  target: nodeNameSchema,
});

export const migrateVMArgsSchema = z.object({
  node: nodeNameSchema,
  vmid: vmidSchema,
  target: nodeNameSchema,
  online: booleanSchema,
  withLocalDisks: booleanSchema,
});

// Firewall operations
export const firewallListArgsSchema = z.object({
  node: nodeNameSchema,
  vmid: vmidSchema,
  type: vmTypeSchema.optional().default('qemu'),
});

export const firewallCreateArgsSchema = z.object({
  node: nodeNameSchema,
  vmid: vmidSchema,
  action: z.enum(['ACCEPT', 'DROP', 'REJECT']),
  ruleType: z.enum(['in', 'out']),
  enable: booleanSchema,
  proto: z.string().optional(),
  dport: z.string().optional(),
  source: z.string().optional(),
  dest: z.string().optional(),
  comment: z.string().max(256).optional(),
  type: vmTypeSchema.optional().default('qemu'),
});

export const firewallDeleteArgsSchema = z.object({
  node: nodeNameSchema,
  vmid: vmidSchema,
  pos: z.coerce.number().int().nonnegative(),
  type: vmTypeSchema.optional().default('qemu'),
});

export const firewallOptionsArgsSchema = z.object({
  node: nodeNameSchema,
  vmid: vmidSchema,
  type: vmTypeSchema.optional().default('qemu'),
});

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

  // VM Lifecycle validators
  static vmStart(args: unknown) {
    return validateArgs(vmStartArgsSchema, args);
  }

  static vmStop(args: unknown) {
    return validateArgs(vmStopArgsSchema, args);
  }

  static vmShutdown(args: unknown) {
    return validateArgs(vmShutdownArgsSchema, args);
  }

  static vmReboot(args: unknown) {
    return validateArgs(vmRebootArgsSchema, args);
  }

  static vmSuspend(args: unknown) {
    return validateArgs(vmSuspendArgsSchema, args);
  }

  static vmResume(args: unknown) {
    return validateArgs(vmResumeArgsSchema, args);
  }

  static vmReset(args: unknown) {
    return validateArgs(vmResetArgsSchema, args);
  }

  // Snapshot validators
  static snapshotCreate(args: unknown) {
    return validateArgs(snapshotCreateArgsSchema, args);
  }

  static snapshotList(args: unknown) {
    return validateArgs(snapshotListArgsSchema, args);
  }

  static snapshotRollback(args: unknown) {
    return validateArgs(snapshotRollbackArgsSchema, args);
  }

  static snapshotDelete(args: unknown) {
    return validateArgs(snapshotDeleteArgsSchema, args);
  }

  static snapshotConfig(args: unknown) {
    return validateArgs(snapshotConfigArgsSchema, args);
  }

  // Task validators
  static taskList(args: unknown) {
    return validateArgs(taskListArgsSchema, args);
  }

  static taskStatus(args: unknown) {
    return validateArgs(taskStatusArgsSchema, args);
  }

  static taskLog(args: unknown) {
    return validateArgs(taskLogArgsSchema, args);
  }

  static taskStop(args: unknown) {
    return validateArgs(taskStopArgsSchema, args);
  }

  // Backup validators
  static backupCreate(args: unknown) {
    return validateArgs(backupCreateArgsSchema, args);
  }

  static backupList(args: unknown) {
    return validateArgs(backupListArgsSchema, args);
  }

  static backupRestore(args: unknown) {
    return validateArgs(backupRestoreArgsSchema, args);
  }

  static backupDelete(args: unknown) {
    return validateArgs(backupDeleteArgsSchema, args);
  }

  // Cloning validators
  static cloneVM(args: unknown) {
    return validateArgs(cloneVMArgsSchema, args);
  }

  static convertToTemplate(args: unknown) {
    return validateArgs(templateArgsSchema, args);
  }

  // Resource management validators
  static vmConfigGet(args: unknown) {
    return validateArgs(vmConfigGetArgsSchema, args);
  }

  static vmConfigUpdate(args: unknown) {
    return validateArgs(vmConfigUpdateArgsSchema, args);
  }

  static diskResize(args: unknown) {
    return validateArgs(diskResizeArgsSchema, args);
  }

  // Migration validators
  static migrationCheck(args: unknown) {
    return validateArgs(migrationCheckArgsSchema, args);
  }

  static migrateVM(args: unknown) {
    return validateArgs(migrateVMArgsSchema, args);
  }

  // Firewall validators
  static firewallList(args: unknown) {
    return validateArgs(firewallListArgsSchema, args);
  }

  static firewallCreate(args: unknown) {
    return validateArgs(firewallCreateArgsSchema, args);
  }

  static firewallDelete(args: unknown) {
    return validateArgs(firewallDeleteArgsSchema, args);
  }

  static firewallOptions(args: unknown) {
    return validateArgs(firewallOptionsArgsSchema, args);
  }
}
