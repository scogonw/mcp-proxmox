# 🚀 Proxmox MCP Server v2.0 - Production Grade

A production-ready, TypeScript-based Model Context Protocol (MCP) server for managing Proxmox Virtual Environment. Built with the latest MCP SDK (v1.21.0) and following the 2025-06-18 specification standards.

## ✨ What's New in v2.0

### 🔧 **Complete Rewrite with Modern Standards**

- ✅ **TypeScript** - Full type safety and better IDE support
- ✅ **Latest MCP SDK 1.21.0** - Supports 2025-06-18 specification
- ✅ **Modular Architecture** - Clean separation of concerns (12+ files)
- ✅ **Production Logging** - Winston-based structured logging
- ✅ **Input Validation** - Zod schemas for all tool inputs
- ✅ **Retry Logic** - Exponential backoff with configurable attempts
- ✅ **Rate Limiting** - Prevents API throttling (100 req/min default)
- ✅ **Error Handling** - Custom error classes with context
- ✅ **Health Checks** - Built-in connection verification
- ✅ **Configuration Validation** - Validates env vars at startup
- ✅ **Auto .env Discovery** - Searches up to 5 parent directories

### 📊 **Key Improvements Over v1.0**

| Feature | v1.0 | v2.0 |
|---------|------|------|
| Language | JavaScript | **TypeScript** |
| MCP SDK | 0.4.0 | **1.21.0** |
| Architecture | 1 file (562 lines) | **12+ files (modular)** |
| Error Handling | Basic try-catch | **Custom error classes** |
| Logging | console.error | **Winston (structured)** |
| Validation | None | **Zod schemas** |
| Retry Logic | None | **Exponential backoff** |
| Rate Limiting | None | **100 req/min** |
| Type Safety | None | **Full TypeScript** |
| Tests | None | **Test infrastructure ready** |

## 🏗️ Architecture

```
src/
├── index.ts              # Entry point with graceful shutdown
├── server.ts             # MCP server implementation
├── config.ts             # Configuration with validation
├── logger.ts             # Winston logging system
├── errors.ts             # Custom error classes
├── types.ts              # TypeScript type definitions
├── validation.ts         # Zod validation schemas
├── formatters.ts         # Output formatting utilities
├── proxmox-client.ts     # API client with retry/rate limiting
└── tools/                # Individual tool implementations
    ├── nodes.ts          # Node management tools
    ├── vms.ts            # VM/container management
    ├── storage.ts        # Storage management
    └── cluster.ts        # Cluster health monitoring
```

## 🔥 Features

### Core Capabilities

- 🖥️ **Node Management** - List nodes, view detailed status
- 💻 **VM Operations** - Manage VMs and LXC containers
- 💾 **Storage Monitoring** - Track storage pools and usage
- 🏗️ **Cluster Health** - Real-time cluster status
- ⚡ **Command Execution** - Run commands on VMs (elevated mode)

### Production Features

- 🔒 **Secure** - Token-based authentication
- 🛡️ **Robust** - Automatic retry on network failures
- 📊 **Observable** - Structured logging with Winston
- ✅ **Validated** - All inputs validated with Zod
- 🔄 **Resilient** - Rate limiting and exponential backoff
- 🚀 **Fast** - TypeScript with optimized builds

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

## 🛠️ Available Tools

### `proxmox_get_nodes`
List all cluster nodes with status and resources.

**Arguments:** None

**Example Output:**
```
🖥️  **Proxmox Cluster Nodes**

🟢 **pve1**
   • Status: online
   • Uptime: 3d 2h 53m
   • CPU: 1.8%
   • Memory: 5.89 GB / 62.21 GB (9.5%)
   • Load: 0.15, 0.12, 0.10
```

### `proxmox_get_vms`
List all VMs and containers.

**Arguments:**
- `node` (optional): Filter by node name
- `type` (optional): Filter by type (qemu, lxc, all)

### `proxmox_get_vm_status`
Get detailed VM status.

**Arguments:**
- `node` (required): Node name
- `vmid` (required): VM ID
- `type` (optional): VM type (qemu, lxc)

### `proxmox_execute_vm_command`
Execute command on VM (requires elevated permissions).

**Arguments:**
- `node` (required): Node name
- `vmid` (required): VM ID
- `command` (required): Shell command
- `type` (optional): VM type

### `proxmox_get_storage`
List storage pools and usage.

**Arguments:**
- `node` (optional): Filter by node

### `proxmox_get_cluster_status`
Get overall cluster health and statistics.

**Arguments:** None

## 🔒 Permission Levels

### Basic Mode (`PROXMOX_ALLOW_ELEVATED=false`)
- ✅ List nodes and status
- ✅ List VMs and containers
- ✅ View VM status
- ✅ List storage pools
- ✅ Basic cluster health

### Elevated Mode (`PROXMOX_ALLOW_ELEVATED=true`)
- ✅ All basic features
- ✅ Detailed node metrics
- ✅ Execute VM commands
- ✅ Advanced cluster statistics

**Required Permissions (Elevated):**
- `Sys.Audit` - Node status and metrics
- `VM.Monitor` - VM monitoring
- `VM.Console` - Command execution

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

## 🙏 Credits

Based on the original Python implementation by [canvrno/ProxmoxMCP](https://github.com/canvrno/ProxmoxMCP).

This v2.0 release represents a complete rewrite with:
- Modern TypeScript architecture
- Latest MCP SDK and standards
- Production-grade features
- Enterprise-ready reliability

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests (if applicable)
5. Submit a pull request

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/gilby125/mcp-proxmox/issues)
- **Documentation**: This README
- **MCP Specification**: [modelcontextprotocol.io](https://modelcontextprotocol.io)

---

**Built with ❤️ using TypeScript and the Model Context Protocol**
