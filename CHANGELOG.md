# Changelog

All notable changes to the Proxmox MCP Server will be documented in this file.

## [2.1.0] - 2025-11-06

### 🎉 Major Feature Release: Phase 1 Enhancements

This release adds 13 powerful new tools, bringing the total from 7 to **20 tools**! The MCP server can now fully manage VMs, not just monitor them.

### Added - VM Lifecycle Management (7 new tools)
- **`proxmox_vm_start`** - Start a VM or container
- **`proxmox_vm_stop`** - Force stop a VM (immediate)
- **`proxmox_vm_shutdown`** - Gracefully shutdown a VM (with timeout)
- **`proxmox_vm_reboot`** - Reboot a VM
- **`proxmox_vm_suspend`** - Suspend VM to disk (QEMU only)
- **`proxmox_vm_resume`** - Resume suspended VM
- **`proxmox_vm_reset`** - Hard reset VM (power button equivalent)

### Added - Snapshot Management (5 new tools)
- **`proxmox_snapshot_create`** - Create VM snapshots (with optional RAM state)
- **`proxmox_snapshot_list`** - List all snapshots for a VM
- **`proxmox_snapshot_rollback`** - Restore VM to a snapshot
- **`proxmox_snapshot_delete`** - Delete a snapshot
- **`proxmox_snapshot_config`** - View snapshot configuration

### Added - Task Monitoring (4 new tools)
- **`proxmox_task_list`** - List tasks on a node (filter by running/errors)
- **`proxmox_task_status`** - Get detailed task status and logs
- **`proxmox_task_log`** - Retrieve task log output
- **`proxmox_task_stop`** - Stop a running task

### Technical Improvements
- Added comprehensive input validation for all new tools (Zod schemas)
- Created modular tool organization (separate files for lifecycle, snapshots, tasks)
- Enhanced error handling with detailed context
- Added task monitoring for async operations
- Improved TypeScript type safety across all new features
- Added extensive JSDoc comments for better IDE support

### Code Statistics
- Total TypeScript lines: **1,348** (up from ~900)
- New files: 3 (lifecycle.ts, snapshots.ts, tasks.ts)
- Total tools: **20** (up from 7)
- Validation schemas: **28** (up from 7)

## [2.0.0] - 2025-11-06

### Complete Rewrite - Production Grade
- Migrated from JavaScript to TypeScript
- Upgraded MCP SDK from 0.4.0 to 1.21.0
- Implemented MCP 2025-06-18 specification
- Added modular architecture (12+ files)
- Implemented Winston logging
- Added Zod validation
- Added retry logic with exponential backoff
- Added rate limiting (100 req/min)
- Created comprehensive error handling

### Initial Tools (7)
- proxmox_get_nodes
- proxmox_get_node_status
- proxmox_get_vms
- proxmox_get_vm_status
- proxmox_execute_vm_command
- proxmox_get_storage
- proxmox_get_cluster_status

## [1.0.0] - Previous

### Initial Release
- Basic Node.js implementation
- Python to JavaScript port
- 7 basic monitoring tools
