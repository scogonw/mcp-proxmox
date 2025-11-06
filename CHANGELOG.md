# Changelog

All notable changes to the Proxmox MCP Server will be documented in this file.

## [2.2.0] - 2025-11-06

### 🚀 Major Feature Release: Phase 2 & 3 Enhancements - Complete Management Suite

This release completes the comprehensive Proxmox management suite by adding 14 powerful new tools across backup, cloning, resource management, migration, and firewall categories. The server now provides **34 total tools** covering the complete VM lifecycle!

### Added - Backup Operations (4 new tools)
- **`proxmox_backup_create`** - Create VM/container backups with snapshot/suspend/stop modes
- **`proxmox_backup_list`** - List backups on storage with optional VM filtering
- **`proxmox_backup_restore`** - Restore VMs from backup archives
- **`proxmox_backup_delete`** - Delete backup files from storage

### Added - Cloning & Templates (2 new tools)
- **`proxmox_vm_clone`** - Clone VMs with full/linked clone support and cross-node cloning
- **`proxmox_vm_template`** - Convert VMs to templates for rapid deployment

### Added - Resource Management (3 new tools)
- **`proxmox_vm_config_get`** - Get complete VM configuration organized by category
- **`proxmox_vm_config_update`** - Update VM parameters (CPU, memory, boot order, etc.)
- **`proxmox_disk_resize`** - Resize VM disks (grow only) with detailed instructions

### Added - Migration (2 new tools)
- **`proxmox_vm_migrate_check`** - Check migration compatibility before migrating
- **`proxmox_vm_migrate`** - Migrate VMs with online/offline and local disk support

### Added - Firewall (4 new tools)
- **`proxmox_firewall_rules_list`** - List all firewall rules for a VM
- **`proxmox_firewall_rule_create`** - Create firewall rules with protocol/port/IP filtering
- **`proxmox_firewall_rule_delete`** - Delete firewall rules by position
- **`proxmox_firewall_options`** - Get firewall configuration options

### Technical Improvements
- Added 14 comprehensive Zod validation schemas for all new tools
- Created 5 new modular tool files (backup.ts, cloning.ts, resources.ts, migration.ts, firewall.ts)
- Enhanced ArgumentValidator class with 14 new validation methods
- Integrated all tools into server.ts with proper error handling
- Maintained TypeScript strict mode compliance across all new code
- Added extensive JSDoc comments for all new functions
- Improved output formatting with categorized configuration display

### Code Statistics
- **Total TypeScript lines**: ~3,200+ (up from ~1,348)
- **New files**: 5 (backup.ts, cloning.ts, resources.ts, migration.ts, firewall.ts)
- **Total tools**: **34** (up from 20)
- **Validation schemas**: **34** (up from 20)
- **Tool files**: 13 modular files

### Documentation
- Updated README.md with comprehensive v2.2 documentation
- Added tool usage examples for all new features
- Added evolution timeline showing progression from v1.0 to v2.2
- Enhanced architecture diagram with all 13 tool files
- Added detailed permission requirements for new tools

### Breaking Changes
- None - All changes are additive and backward compatible

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
