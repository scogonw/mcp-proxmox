#!/bin/bash

# Proxmox MCP Server - Docker Runner Script
# This script makes it easy to run the MCP server in Docker

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to print colored messages
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if .env file exists
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    print_warning ".env file not found!"
    print_info "Creating .env from .env.example..."
    if [ -f "$SCRIPT_DIR/.env.example" ]; then
        cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
        print_success ".env file created"
        print_warning "Please edit .env file with your Proxmox credentials before continuing"
        exit 0
    else
        print_error ".env.example not found. Please create .env manually."
        exit 1
    fi
fi

# Parse command
COMMAND="${1:-help}"

case "$COMMAND" in
    build)
        print_info "Building Docker image..."
        docker build -t proxmox-mcp-server:2.2.0 "$SCRIPT_DIR"
        print_success "Docker image built successfully"
        ;;

    start)
        print_info "Starting Proxmox MCP Server container..."
        docker-compose -f "$SCRIPT_DIR/docker-compose.yml" up -d
        print_success "Container started"
        print_info "View logs with: $0 logs"
        ;;

    stop)
        print_info "Stopping Proxmox MCP Server container..."
        docker-compose -f "$SCRIPT_DIR/docker-compose.yml" down
        print_success "Container stopped"
        ;;

    restart)
        print_info "Restarting Proxmox MCP Server container..."
        docker-compose -f "$SCRIPT_DIR/docker-compose.yml" restart
        print_success "Container restarted"
        ;;

    logs)
        print_info "Showing container logs (Ctrl+C to exit)..."
        docker-compose -f "$SCRIPT_DIR/docker-compose.yml" logs -f
        ;;

    status)
        print_info "Container status:"
        docker-compose -f "$SCRIPT_DIR/docker-compose.yml" ps
        ;;

    shell)
        print_info "Opening shell in container..."
        docker exec -it proxmox-mcp-server sh
        ;;

    test)
        print_info "Testing MCP server (list tools)..."
        echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | \
            docker exec -i proxmox-mcp-server node dist/index.js
        ;;

    clean)
        print_warning "This will remove the container and image. Continue? (y/N)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            print_info "Stopping and removing container..."
            docker-compose -f "$SCRIPT_DIR/docker-compose.yml" down
            print_info "Removing Docker image..."
            docker rmi proxmox-mcp-server:2.2.0 || true
            print_success "Cleanup complete"
        else
            print_info "Cleanup cancelled"
        fi
        ;;

    update)
        print_info "Updating Proxmox MCP Server..."
        print_info "Step 1: Pulling latest code..."
        git pull
        print_info "Step 2: Rebuilding Docker image..."
        docker build -t proxmox-mcp-server:2.2.0 "$SCRIPT_DIR"
        print_info "Step 3: Restarting container..."
        docker-compose -f "$SCRIPT_DIR/docker-compose.yml" up -d
        print_success "Update complete"
        ;;

    claude-config)
        print_info "Generating Claude Desktop configuration..."
        echo ""
        echo "Add this to your Claude Desktop configuration:"
        echo ""
        echo "{"
        echo '  "mcpServers": {'
        echo '    "proxmox": {'
        echo '      "command": "docker",'
        echo '      "args": ['
        echo '        "exec",'
        echo '        "-i",'
        echo '        "proxmox-mcp-server",'
        echo '        "node",'
        echo '        "dist/index.js"'
        echo '      ]'
        echo '    }'
        echo '  }'
        echo "}"
        echo ""
        print_info "Configuration file locations:"
        print_info "  macOS: ~/Library/Application Support/Claude/claude_desktop_config.json"
        print_info "  Windows: %APPDATA%\\Claude\\claude_desktop_config.json"
        print_info "  Linux: ~/.config/Claude/claude_desktop_config.json"
        ;;

    help|*)
        echo "Proxmox MCP Server - Docker Management Script"
        echo ""
        echo "Usage: $0 <command>"
        echo ""
        echo "Commands:"
        echo "  build          Build the Docker image"
        echo "  start          Start the container"
        echo "  stop           Stop the container"
        echo "  restart        Restart the container"
        echo "  logs           Show container logs (follow mode)"
        echo "  status         Show container status"
        echo "  shell          Open shell in container"
        echo "  test           Test MCP server (list tools)"
        echo "  clean          Remove container and image"
        echo "  update         Pull latest code and rebuild"
        echo "  claude-config  Show Claude Desktop configuration"
        echo "  help           Show this help message"
        echo ""
        echo "Quick start:"
        echo "  1. Create .env file: cp .env.example .env"
        echo "  2. Edit .env with your Proxmox credentials"
        echo "  3. Build image: $0 build"
        echo "  4. Start container: $0 start"
        echo "  5. Test: $0 test"
        echo "  6. Configure Claude: $0 claude-config"
        ;;
esac
