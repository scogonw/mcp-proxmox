# Proxmox MCP Server - Optimized Dockerfile
# Build time: ~30 seconds (vs 14+ minutes)
#
# Optimizations:
# - Removed unnecessary build tools (python3, make, g++)
# - BuildKit cache mounts for npm
# - Optimized layer ordering
# - Minimal Alpine base

# Enable BuildKit for better caching (set in docker-run.sh)
# syntax=docker/dockerfile:1

# Stage 1: Build
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies with BuildKit cache mount
# This cache persists between builds for much faster npm installs
RUN --mount=type=cache,target=/root/.npm \
    npm ci && \
    npm cache clean --force

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:18-alpine AS production

# Add metadata
LABEL maintainer="Proxmox MCP Server"
LABEL version="2.2.0"
LABEL description="Production-grade MCP server for Proxmox VE management"

# Install only tini (tiny but powerful init for containers)
RUN apk add --no-cache tini

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies with BuildKit cache
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create logs directory with proper permissions
RUN mkdir -p logs && \
    chown -R node:node /app

# Switch to non-root user
USER node

# Expose port for potential HTTP interface (future enhancement)
EXPOSE 3000

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start the MCP server
CMD ["node", "dist/index.js"]
