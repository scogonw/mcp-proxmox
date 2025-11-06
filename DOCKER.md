# 🐳 Docker Deployment Guide

Complete guide for running Proxmox MCP Server v2.2.0 in Docker and integrating it with Claude Desktop App.

## ⚡ Build Performance

**Optimized for speed!** Our Docker build is highly optimized:
- **First build**: ~30 seconds (vs 14+ minutes with old approach)
- **Rebuild with cache**: ~5-10 seconds
- **Image size**: ~120MB (production)

See [DOCKER-OPTIMIZATION.md](./DOCKER-OPTIMIZATION.md) for detailed performance analysis and optimization techniques.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Configuration](#configuration)
4. [Building and Running](#building-and-running)
5. [Claude Desktop Integration](#claude-desktop-integration)
6. [Management Commands](#management-commands)
7. [Troubleshooting](#troubleshooting)
8. [Advanced Configuration](#advanced-configuration)

## Prerequisites

### Required Software

- **Docker** 20.10+ ([Install Docker](https://docs.docker.com/get-docker/))
- **Docker Compose** 2.0+ (usually included with Docker Desktop)
- **Claude Desktop App** ([Download](https://claude.ai/download))
- **Proxmox VE** 7.0+ with API access

### Verify Installation

```bash
# Check Docker version
docker --version
# Output: Docker version 20.10.x or higher

# Check Docker Compose version
docker-compose --version
# Output: Docker Compose version 2.x.x or higher

# Verify Docker is running
docker ps
# Should show running containers or empty list (no errors)
```

## Quick Start

### Step 1: Clone and Configure

```bash
# Clone the repository
git clone https://github.com/gilby125/mcp-proxmox.git
cd mcp-proxmox

# Create environment file
cp .env.example .env

# Edit with your Proxmox credentials
nano .env
# Or use: vim .env, code .env, etc.
```

### Step 2: Configure Environment

Edit `.env` file with your Proxmox details:

```bash
# Required Configuration
PROXMOX_HOST=192.168.1.100          # Your Proxmox server IP/hostname
PROXMOX_USER=root@pam               # Proxmox user
PROXMOX_TOKEN_NAME=mcp-server       # API token name
PROXMOX_TOKEN_VALUE=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  # API token secret

# Optional Configuration
PROXMOX_PORT=8006                   # Default: 8006
PROXMOX_ALLOW_ELEVATED=false        # Enable advanced features
LOG_LEVEL=info                      # debug, info, warn, error
```

### Step 3: Build and Start

```bash
# Using the helper script (recommended)
./docker-run.sh build
./docker-run.sh start

# Or using Docker Compose directly
docker-compose up -d
```

### Step 4: Verify

```bash
# Check container status
./docker-run.sh status

# View logs
./docker-run.sh logs

# Test the MCP server
./docker-run.sh test
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PROXMOX_HOST` | ✅ Yes | - | Proxmox server IP or hostname |
| `PROXMOX_USER` | ✅ Yes | `root@pam` | Proxmox user account |
| `PROXMOX_TOKEN_NAME` | ✅ Yes | - | API token name |
| `PROXMOX_TOKEN_VALUE` | ✅ Yes | - | API token secret |
| `PROXMOX_PORT` | ❌ No | `8006` | Proxmox API port |
| `PROXMOX_ALLOW_ELEVATED` | ❌ No | `false` | Enable elevated operations |
| `PROXMOX_TIMEOUT` | ❌ No | `30000` | API timeout (ms) |
| `PROXMOX_RETRY_ATTEMPTS` | ❌ No | `3` | Number of retry attempts |
| `PROXMOX_RETRY_DELAY` | ❌ No | `1000` | Base retry delay (ms) |
| `LOG_LEVEL` | ❌ No | `info` | Logging level |

### Creating Proxmox API Token

1. Log into Proxmox web interface (https://your-proxmox:8006)
2. Navigate to **Datacenter** → **Permissions** → **API Tokens**
3. Click **Add** button
4. Fill in the form:
   - **User**: `root@pam` (or your preferred user)
   - **Token ID**: `mcp-server` (or any name you prefer)
   - **Privilege Separation**: **Uncheck** (for full access)
5. Click **Add**
6. **IMPORTANT**: Copy both the **Token ID** and **Secret** immediately
7. Add to your `.env` file:
   ```bash
   PROXMOX_TOKEN_NAME=mcp-server
   PROXMOX_TOKEN_VALUE=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```

## Building and Running

### Method 1: Using Helper Script (Recommended)

The `docker-run.sh` script provides easy management:

```bash
# Build Docker image
./docker-run.sh build

# Start container
./docker-run.sh start

# Stop container
./docker-run.sh stop

# Restart container
./docker-run.sh restart

# View logs (follow mode)
./docker-run.sh logs

# Check status
./docker-run.sh status

# Open shell in container
./docker-run.sh shell

# Test MCP server
./docker-run.sh test

# Clean up (remove container and image)
./docker-run.sh clean

# Update to latest version
./docker-run.sh update

# Show Claude Desktop config
./docker-run.sh claude-config
```

### Method 2: Using Docker Compose

```bash
# Build and start in detached mode
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop container
docker-compose down

# Restart
docker-compose restart

# Check status
docker-compose ps
```

### Method 3: Using Docker CLI

```bash
# Build image
docker build -t proxmox-mcp-server:2.2.0 .

# Run container
docker run -d \
  --name proxmox-mcp-server \
  --env-file .env \
  -v $(pwd)/logs:/app/logs \
  --network host \
  proxmox-mcp-server:2.2.0

# View logs
docker logs -f proxmox-mcp-server

# Stop container
docker stop proxmox-mcp-server

# Remove container
docker rm proxmox-mcp-server
```

## Claude Desktop Integration

### How It Works

**Container Architecture:**
1. The Docker container runs `sleep infinity` to stay alive
2. Container is always running and ready for connections
3. Claude Desktop uses `docker exec` to run the MCP server on-demand
4. Each Claude session gets a fresh MCP server instance
5. Server communicates via stdio (stdin/stdout)

**Why this design:**
- ✅ Container stays running (no restart loops)
- ✅ MCP server runs only when needed
- ✅ Clean isolation per session
- ✅ Proper stdio communication
- ✅ No port conflicts or networking issues

### Step 1: Ensure Container is Running

```bash
./docker-run.sh status
# Should show container as "Up"

# Or check with docker directly:
docker ps | grep proxmox-mcp-server
# Should show: "Up X minutes" (not "Restarting")
```

**If container is restarting:**
```bash
# Check container logs
docker logs proxmox-mcp-server

# Restart the container
./docker-run.sh restart

# Or rebuild if needed
./docker-run.sh clean
./docker-run.sh build
./docker-run.sh start
```

### Step 2: Get Configuration

```bash
./docker-run.sh claude-config
```

This will output the configuration you need to add to Claude Desktop.

### Step 3: Configure Claude Desktop

#### macOS

1. Open Claude Desktop App
2. Click **Claude** → **Settings** (or press `Cmd + ,`)
3. Click **Developer** tab
4. Click **Edit Config** button
5. This opens: `~/Library/Application Support/Claude/claude_desktop_config.json`
6. Add the MCP server configuration:

```json
{
  "mcpServers": {
    "proxmox": {
      "command": "docker",
      "args": [
        "exec",
        "-i",
        "proxmox-mcp-server",
        "node",
        "dist/index.js"
      ]
    }
  }
}
```

#### Windows

1. Open Claude Desktop App
2. Click **File** → **Settings**
3. Click **Developer** tab
4. Click **Edit Config** button
5. This opens: `%APPDATA%\Claude\claude_desktop_config.json`
6. Add the same configuration as above

#### Linux

1. Open Claude Desktop App
2. Go to Settings → Developer
3. Edit config at: `~/.config/Claude/claude_desktop_config.json`
4. Add the same configuration as above

### Step 4: Restart Claude Desktop

1. **Quit** Claude Desktop completely (not just close window)
   - macOS: `Cmd + Q`
   - Windows: Right-click system tray → Quit
   - Linux: Close all windows or `killall claude`
2. **Restart** Claude Desktop
3. Open a new conversation

### Step 5: Verify Integration

In Claude Desktop, you should now be able to:

1. See the Proxmox MCP tools available (🔧 icon)
2. Ask Claude to: "List my Proxmox nodes"
3. Claude should use the `proxmox_get_nodes` tool

Example prompts to try:
```
"Show me all VMs in my Proxmox cluster"
"Create a snapshot of VM 100 on node pve1"
"List all backups on storage backup-storage"
"What's the status of VM 100?"
```

## Management Commands

### Viewing Logs

```bash
# Container logs (Docker)
./docker-run.sh logs

# Application logs (Winston)
docker exec proxmox-mcp-server cat logs/combined.log

# Follow application logs
docker exec proxmox-mcp-server tail -f logs/combined.log

# Error logs only
docker exec proxmox-mcp-server cat logs/error.log
```

### Debugging

```bash
# Open shell in container
./docker-run.sh shell

# Inside container, you can:
# - Check files: ls -la
# - View config: cat dist/config.js
# - Test manually: echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js
```

### Resource Monitoring

```bash
# View container stats (CPU, memory)
docker stats proxmox-mcp-server

# View detailed container info
docker inspect proxmox-mcp-server

# Check container health
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### Updating

```bash
# Pull latest code and rebuild
./docker-run.sh update

# Or manually:
git pull
docker-compose up -d --build
```

## Troubleshooting

### Container Is Restarting (Most Common Issue)

**Symptom:** Claude Desktop shows error: `Container is restarting, wait until the container is running`

**Cause:** This was the old Dockerfile design where the container tried to run the MCP server directly, causing it to exit and restart continuously.

**Solution:**
```bash
# 1. Stop and remove the old container
docker stop proxmox-mcp-server
docker rm proxmox-mcp-server

# 2. Rebuild with the new Dockerfile (uses 'sleep infinity')
./docker-run.sh build

# 3. Start the container
./docker-run.sh start

# 4. Verify it's running (not restarting)
docker ps | grep proxmox-mcp-server
# Should show: "Up X seconds" (not "Restarting")

# 5. Restart Claude Desktop completely
# macOS: killall Claude && open -a Claude
# Windows: Close and reopen from Start menu
# Linux: killall claude && claude
```

**Verify the fix:**
```bash
# Container should be running sleep infinity
docker exec proxmox-mcp-server ps aux
# Should show: "sleep infinity" process running

# Test MCP server manually
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  docker exec -i proxmox-mcp-server node dist/index.js
# Should return JSON with tools list
```

### Container Won't Start

**Check logs:**
```bash
docker-compose logs proxmox-mcp-server
```

**Common issues:**
- Missing `.env` file → Create from `.env.example`
- Invalid Proxmox credentials → Verify token in Proxmox UI
- Port conflicts → Check if port 8006 is available

### Claude Desktop Not Seeing Tools

**Verify container is running:**
```bash
docker ps | grep proxmox-mcp-server
```

**Test MCP server:**
```bash
./docker-run.sh test
```

**Check Claude Desktop config:**
```bash
# macOS
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Linux
cat ~/.config/Claude/claude_desktop_config.json

# Windows (PowerShell)
Get-Content "$env:APPDATA\Claude\claude_desktop_config.json"
```

**Restart Claude Desktop completely:**
- macOS: `killall Claude` then restart
- Windows: Task Manager → End Claude → Restart
- Linux: `killall claude` then restart

### Connection to Proxmox Fails

**Test from container:**
```bash
docker exec proxmox-mcp-server sh -c "apk add curl && curl -k https://$PROXMOX_HOST:$PROXMOX_PORT/api2/json/version"
```

**Check network:**
```bash
# Verify host networking
docker inspect proxmox-mcp-server | grep NetworkMode
# Should show "host"

# Test connectivity
docker exec proxmox-mcp-server ping -c 3 $PROXMOX_HOST
```

**Verify Proxmox is reachable from host:**
```bash
curl -k https://YOUR_PROXMOX_HOST:8006/api2/json/version
```

### Permission Errors

**Check API token permissions in Proxmox:**
1. Go to Datacenter → Permissions → API Tokens
2. Verify token exists and privilege separation is off
3. Check user permissions under Datacenter → Permissions → Users

**Required permissions:**
- Basic: `VM.Audit`, `VM.PowerMgmt`, `VM.Backup`, `Datastore.Audit`
- Elevated: Add `Sys.Audit`, `VM.Monitor`, `VM.Console`

### High Memory Usage

**Adjust resource limits in `docker-compose.yml`:**
```yaml
deploy:
  resources:
    limits:
      memory: 256M  # Reduce if needed
```

**Restart with new limits:**
```bash
docker-compose up -d
```

## Advanced Configuration

### Custom Network Configuration

If you need network isolation instead of host networking:

```yaml
# docker-compose.yml
services:
  proxmox-mcp:
    network_mode: bridge
    ports:
      - "3000:3000"  # If adding HTTP interface
```

### Persistent Data

Logs are automatically persisted in the `./logs` directory.

To add more volumes:
```yaml
volumes:
  - ./logs:/app/logs
  - ./custom-config:/app/config
```

### Environment-Specific Configs

Create multiple environment files:

```bash
# .env.production
PROXMOX_HOST=prod-proxmox.example.com
LOG_LEVEL=warn

# .env.development
PROXMOX_HOST=dev-proxmox.local
LOG_LEVEL=debug
```

Use specific env file:
```bash
docker-compose --env-file .env.production up -d
```

### Building for Different Architectures

```bash
# For ARM (Raspberry Pi, M1/M2 Mac)
docker buildx build --platform linux/arm64 -t proxmox-mcp-server:2.2.0-arm64 .

# For AMD64 (Intel/AMD)
docker buildx build --platform linux/amd64 -t proxmox-mcp-server:2.2.0-amd64 .

# Multi-platform
docker buildx build --platform linux/amd64,linux/arm64 -t proxmox-mcp-server:2.2.0 .
```

### Running Multiple Instances

To run multiple instances for different Proxmox servers:

```bash
# Instance 1
docker run -d --name proxmox-mcp-prod --env-file .env.prod ...

# Instance 2
docker run -d --name proxmox-mcp-dev --env-file .env.dev ...
```

Update Claude Desktop config:
```json
{
  "mcpServers": {
    "proxmox-prod": {
      "command": "docker",
      "args": ["exec", "-i", "proxmox-mcp-prod", "node", "dist/index.js"]
    },
    "proxmox-dev": {
      "command": "docker",
      "args": ["exec", "-i", "proxmox-mcp-dev", "node", "dist/index.js"]
    }
  }
}
```

## Security Best Practices

1. **Never commit `.env` file** to version control
2. **Use read-only API tokens** when possible
3. **Enable privilege separation** for production tokens
4. **Rotate API tokens** regularly
5. **Use firewall rules** to restrict Proxmox API access
6. **Run container as non-root** (already configured)
7. **Keep Docker and images updated**
8. **Monitor logs** for suspicious activity

## Performance Tuning

### For High-Volume Environments

```yaml
environment:
  - PROXMOX_RETRY_ATTEMPTS=5
  - PROXMOX_TIMEOUT=60000
  - LOG_LEVEL=warn  # Reduce logging overhead
```

### Resource Limits

Adjust based on your needs:
```yaml
deploy:
  resources:
    limits:
      cpus: '2'      # Increase for heavy usage
      memory: 1G
```

## Backup and Recovery

### Backing Up Configuration

```bash
# Backup .env file
cp .env .env.backup

# Backup logs
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/
```

### Disaster Recovery

```bash
# Save container state
docker commit proxmox-mcp-server proxmox-mcp-backup:$(date +%Y%m%d)

# Export image
docker save proxmox-mcp-server:2.2.0 | gzip > proxmox-mcp-2.2.0.tar.gz

# Restore image
docker load < proxmox-mcp-2.2.0.tar.gz
```

## Support

- **GitHub Issues**: [Report a bug](https://github.com/gilby125/mcp-proxmox/issues)
- **Documentation**: [Main README](./README.md)
- **Docker Docs**: [Docker Documentation](https://docs.docker.com/)
- **Claude Desktop**: [Claude Help Center](https://support.anthropic.com/)

---

**🎉 You're all set! Your Proxmox MCP Server is now running in Docker and integrated with Claude Desktop!**
