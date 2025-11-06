# 🚀 Proxmox MCP Server v2.2 - Production Grade

A production-ready, TypeScript-based Model Context Protocol (MCP) server for comprehensive Proxmox Virtual Environment management. Built with the latest MCP SDK (v1.21.0) and following the 2025-06-18 specification standards.

**Now with 34 comprehensive tools covering the complete Proxmox management lifecycle!**

## ✨ What's New in v2.2

### 🎯 **Phase 2 & 3 Enhancements - 14 New Tools**

#### **Phase 2: Backup & Cloning (6 tools)**
- 💾 **Backup Operations** - Create, list, restore, and delete VM backups
- 🔄 **Cloning** - Full and linked clones with cross-node support
- 📑 **Templates** - Convert VMs to templates for rapid deployment

#### **Phase 3: Advanced Management (8 tools)**
- ⚙️ **Resource Management** - VM configuration and disk resizing
- 🔄 **Migration** - Live and offline VM migration with compatibility checks
- 🛡️ **Firewall** - Complete firewall rule management for VMs

### 📊 **Evolution Timeline**

| Version | Tools | Key Features |
|---------|-------|--------------|
| v1.0 | 7 | Basic monitoring (JavaScript) |
| v2.0 | 7 | TypeScript rewrite with MCP 1.21.0 |
| v2.1 | 20 | VM lifecycle, snapshots, task monitoring |
| **v2.2** | **34** | **Backup, cloning, resources, migration, firewall** |

## 🏗️ Architecture

```
src/
├── index.ts              # Entry point with graceful shutdown
├── server.ts             # MCP server implementation (34 tools)
├── config.ts             # Configuration with validation
├── logger.ts             # Winston logging system
├── errors.ts             # Custom error classes
├── types.ts              # TypeScript type definitions
├── validation.ts         # Zod validation schemas (34 schemas)
├── formatters.ts         # Output formatting utilities
├── proxmox-client.ts     # API client with retry/rate limiting
└── tools/                # Individual tool implementations
    ├── nodes.ts          # Node management (2 tools)
    ├── vms.ts            # VM/container monitoring (3 tools)
    ├── storage.ts        # Storage management (1 tool)
    ├── cluster.ts        # Cluster health (1 tool)
    ├── lifecycle.ts      # VM power states (7 tools)
    ├── snapshots.ts      # Snapshot management (5 tools)
    ├── tasks.ts          # Task monitoring (4 tools)
    ├── backup.ts         # Backup operations (4 tools)
    ├── cloning.ts        # VM cloning & templates (2 tools)
    ├── resources.ts      # Resource management (3 tools)
    ├── migration.ts      # VM migration (2 tools)
    └── firewall.ts       # Firewall rules (4 tools)
```

## 🔥 Complete Feature Set

### 📊 Monitoring & Status (7 tools)
- `proxmox_get_nodes` - List all cluster nodes with status
- `proxmox_get_node_status` - Detailed node metrics (elevated)
- `proxmox_get_vms` - List all VMs and containers
- `proxmox_get_vm_status` - Detailed VM status and metrics
- `proxmox_execute_vm_command` - Execute commands on VMs (elevated)
- `proxmox_get_storage` - Storage pools and usage
- `proxmox_get_cluster_status` - Cluster health overview

### ⚡ VM Lifecycle (7 tools)
- `proxmox_vm_start` - Start VMs and containers
- `proxmox_vm_stop` - Force stop (hard shutdown)
- `proxmox_vm_shutdown` - Graceful ACPI shutdown
- `proxmox_vm_reboot` - Reboot guest OS
- `proxmox_vm_suspend` - Suspend to disk (QEMU only)
- `proxmox_vm_resume` - Resume from suspension
- `proxmox_vm_reset` - Hard reset (like reset button)

### 📸 Snapshots (5 tools)
- `proxmox_snapshot_create` - Create VM snapshots with optional RAM state
- `proxmox_snapshot_list` - List all snapshots for a VM
- `proxmox_snapshot_rollback` - Rollback to snapshot
- `proxmox_snapshot_delete` - Delete snapshot
- `proxmox_snapshot_config` - Get snapshot configuration

### 📋 Task Management (4 tools)
- `proxmox_task_list` - List tasks with filtering
- `proxmox_task_status` - Get task status and progress
- `proxmox_task_log` - Retrieve task logs
- `proxmox_task_stop` - Stop running tasks

### 💾 Backup Operations (4 tools)
- `proxmox_backup_create` - Create backups with snapshot/suspend/stop modes
- `proxmox_backup_list` - List backups on storage
- `proxmox_backup_restore` - Restore VMs from backups
- `proxmox_backup_delete` - Delete backup archives

### 🔄 Cloning & Templates (2 tools)
- `proxmox_vm_clone` - Clone VMs (full/linked, cross-node)
- `proxmox_vm_template` - Convert VMs to templates

### ⚙️ Resource Management (3 tools)
- `proxmox_vm_config_get` - Get complete VM configuration
- `proxmox_vm_config_update` - Update VM parameters (CPU, memory, etc.)
- `proxmox_disk_resize` - Resize VM disks (grow only)

### 🔄 Migration (2 tools)
- `proxmox_vm_migrate_check` - Check migration compatibility
- `proxmox_vm_migrate` - Migrate VMs (online/offline, local disks)

### 🛡️ Firewall (4 tools)
- `proxmox_firewall_rules_list` - List all firewall rules
- `proxmox_firewall_rule_create` - Create firewall rules
- `proxmox_firewall_rule_delete` - Delete firewall rules
- `proxmox_firewall_options` - Get firewall configuration

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm
- TypeScript knowledge (for development)
- Proxmox VE 7.0+ with API access
- API token with appropriate permissions

### Quick Install

```bash
# Clone repository
git clone https://github.com/gilby125/mcp-proxmox.git
cd mcp-proxmox

# Install dependencies
npm install

# Build TypeScript
npm run build

# Copy environment template
cp .env.example .env

# Edit .env with your Proxmox credentials
nano .env
```

### Configuration

Create `.env` file:

```bash
# Required
PROXMOX_HOST=192.168.1.100
PROXMOX_USER=root@pam
PROXMOX_TOKEN_NAME=mcp-server
PROXMOX_TOKEN_VALUE=your-token-value-here

# Optional
PROXMOX_PORT=8006                    # Default: 8006
PROXMOX_ALLOW_ELEVATED=false        # Enable advanced features
PROXMOX_TIMEOUT=30000               # API timeout (ms)
PROXMOX_RETRY_ATTEMPTS=3            # Number of retries
PROXMOX_RETRY_DELAY=1000            # Base retry delay (ms)
LOG_LEVEL=info                      # debug, info, warn, error
```

## 🚀 Usage

### Build and Run

```bash
# Production build
npm run build
npm start

# Development mode (auto-rebuild)
npm run dev

# Type checking only
npm run typecheck

# Clean and rebuild
npm run rebuild
```

### Testing MCP Server

```bash
# List available tools
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | npm start

# Get cluster nodes
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "proxmox_get_nodes", "arguments": {}}}' | npm start

# Create a snapshot
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "proxmox_snapshot_create", "arguments": {"node": "pve1", "vmid": 100, "snapname": "backup-2025"}}}' | npm start
```

### MCP Client Configuration

For Claude Code or other MCP clients:

```json
{
  "mcpServers": {
    "proxmox": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/absolute/path/to/mcp-proxmox"
    }
  }
}
```

## 🛠️ Tool Examples

### VM Lifecycle Management

```typescript
// Start a VM
proxmox_vm_start({
  node: "pve1",
  vmid: 100,
  type: "qemu"
})

// Graceful shutdown with timeout
proxmox_vm_shutdown({
  node: "pve1",
  vmid: 100,
  timeout: 300
})
```

### Snapshot Operations

```typescript
// Create snapshot with RAM state
proxmox_snapshot_create({
  node: "pve1",
  vmid: 100,
  snapname: "before-upgrade",
  description: "Snapshot before system upgrade",
  vmstate: true  // Include RAM for running snapshots
})

// Rollback to snapshot
proxmox_snapshot_rollback({
  node: "pve1",
  vmid: 100,
  snapname: "before-upgrade"
})
```

### Backup & Restore

```typescript
// Create backup with snapshot mode
proxmox_backup_create({
  node: "pve1",
  vmid: 100,
  storage: "backup-storage",
  mode: "snapshot",      // Live backup
  compress: "zstd"       // Best compression
})

// List backups
proxmox_backup_list({
  node: "pve1",
  storage: "backup-storage",
  vmid: 100  // Optional filter
})

// Restore backup
proxmox_backup_restore({
  node: "pve1",
  storage: "backup-storage",
  archive: "vzdump-qemu-100-2025_11_06-14_30_00.vma.zst",
  vmid: 101,  // Restore to new ID
  force: false
})
```

### Cloning & Templates

```typescript
// Create full clone
proxmox_vm_clone({
  node: "pve1",
  vmid: 100,
  newid: 200,
  name: "web-server-02",
  full: true,           // Full clone (independent)
  target: "pve2"        // Clone to different node
})

// Convert to template
proxmox_vm_template({
  node: "pve1",
  vmid: 100
})
```

### Resource Management

```typescript
// Update VM configuration
proxmox_vm_config_update({
  node: "pve1",
  vmid: 100,
  config: {
    cores: 4,
    memory: 8192,
    balloon: 4096
  }
})

// Resize disk
proxmox_disk_resize({
  node: "pve1",
  vmid: 100,
  disk: "scsi0",
  size: "+50G"  // Grow by 50GB
})
```

### Migration

```typescript
// Check migration compatibility
proxmox_vm_migrate_check({
  node: "pve1",
  vmid: 100,
  target: "pve2"
})

// Perform live migration
proxmox_vm_migrate({
  node: "pve1",
  vmid: 100,
  target: "pve2",
  online: true,           // Live migration
  withLocalDisks: true    // Migrate local disks
})
```

### Firewall Management

```typescript
// Create firewall rule
proxmox_firewall_rule_create({
  node: "pve1",
  vmid: 100,
  action: "ACCEPT",
  ruleType: "in",
  enable: true,
  proto: "tcp",
  dport: "80,443",
  source: "0.0.0.0/0",
  comment: "Allow HTTP/HTTPS"
})

// List firewall rules
proxmox_firewall_rules_list({
  node: "pve1",
  vmid: 100
})
```

## 🔒 Permission Levels

### Basic Mode (`PROXMOX_ALLOW_ELEVATED=false`)
- ✅ List nodes, VMs, storage, cluster status
- ✅ VM lifecycle operations (start, stop, shutdown, etc.)
- ✅ Snapshot management
- ✅ Task monitoring
- ✅ Backup operations
- ✅ Cloning and templates
- ✅ Resource management
- ✅ Migration
- ✅ Firewall management

### Elevated Mode (`PROXMOX_ALLOW_ELEVATED=true`)
- ✅ All basic features
- ✅ Detailed node metrics
- ✅ Execute VM commands
- ✅ Advanced cluster statistics

**Required Permissions:**
- **Basic**: `VM.Audit`, `VM.PowerMgmt`, `VM.Backup`, `VM.Clone`, `VM.Config.Disk`, `VM.Config.Network`, `VM.Snapshot`, `Datastore.Audit`
- **Elevated**: Add `Sys.Audit`, `VM.Monitor`, `VM.Console`

## 🔐 API Token Setup

1. Log into Proxmox web interface
2. Navigate to **Datacenter** → **Permissions** → **API Tokens**
3. Click **Add**:
   - **User**: Select user (e.g., `root@pam`)
   - **Token ID**: Enter name (e.g., `mcp-server`)
   - **Privilege Separation**: Uncheck for full access
4. Copy the **Token ID** and **Secret** immediately
5. Set in `.env`:
   ```bash
   PROXMOX_TOKEN_NAME=mcp-server
   PROXMOX_TOKEN_VALUE=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```

## 📊 Logging

Logs are written to:
- `logs/combined.log` - All logs (JSON format)
- `logs/error.log` - Error logs only (JSON format)
- Console - Pretty-printed with colors (development)

Configure log level:
```bash
LOG_LEVEL=debug   # Verbose logging
LOG_LEVEL=info    # Normal logging (default)
LOG_LEVEL=warn    # Warnings only
LOG_LEVEL=error   # Errors only
```

## 🐛 Troubleshooting

### Build Errors

```bash
# Clean and rebuild
npm run clean
npm install
npm run build
```

### Connection Errors

1. **Verify Proxmox is reachable:**
   ```bash
   curl -k https://YOUR_PROXMOX_HOST:8006/api2/json/version
   ```

2. **Test API token:**
   ```bash
   curl -k -H "Authorization: PVEAPIToken=USER!TOKEN=SECRET" \
     https://YOUR_PROXMOX_HOST:8006/api2/json/nodes
   ```

3. **Check logs:**
   ```bash
   tail -f logs/combined.log
   ```

### Permission Errors

- Ensure API token has required permissions
- For elevated mode, add `Sys.Audit`, `VM.Monitor`, `VM.Console`
- Check token privilege separation is disabled

## 🚀 Development

### Project Scripts

```bash
npm run build         # Build TypeScript
npm run build:watch   # Build with watch mode
npm run dev          # Development mode
npm run clean        # Clean dist directory
npm run typecheck    # Type checking only
```

### Adding New Tools

1. Create tool file in `src/tools/`
2. Add validation schema in `src/validation.ts`
3. Register in `src/server.ts`
4. Update type definitions in `src/types.ts`

## 🎯 Production Features

- 🔒 **Secure** - Token-based authentication
- 🛡️ **Robust** - Automatic retry with exponential backoff
- 📊 **Observable** - Structured logging with Winston
- ✅ **Validated** - All 34 tools use Zod validation
- 🔄 **Resilient** - Rate limiting (100 req/min)
- 🚀 **Fast** - TypeScript with optimized builds
- 📝 **Type-Safe** - Full TypeScript coverage
- 🏗️ **Modular** - Clean separation of concerns (13 tool files)

## 🙏 Credits

Based on the original Python implementation by [canvrno/ProxmoxMCP](https://github.com/canvrno/ProxmoxMCP).

This v2.2 release represents a complete evolution:
- v1.0: Basic monitoring (7 tools)
- v2.0: TypeScript rewrite with production features
- v2.1: VM lifecycle and snapshot management (20 tools)
- v2.2: Complete Proxmox management suite (34 tools)

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Ensure TypeScript compilation succeeds
5. Submit a pull request

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/gilby125/mcp-proxmox/issues)
- **Documentation**: This README
- **MCP Specification**: [modelcontextprotocol.io](https://modelcontextprotocol.io)

---

**Built with ❤️ using TypeScript and the Model Context Protocol**

**🎉 Now with 34 comprehensive tools for complete Proxmox management!**
