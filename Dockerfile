# Proxmox MCP Server - Production Dockerfile
# Multi-stage build for optimized image size

# Stage 1: Build
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm ci --only=development

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:18-alpine

# Add metadata
LABEL maintainer="Proxmox MCP Server"
LABEL version="2.2.0"
LABEL description="Production-grade MCP server for Proxmox VE management"

# Install runtime dependencies
RUN apk add --no-cache tini

# Create app directory
WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create logs directory
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
