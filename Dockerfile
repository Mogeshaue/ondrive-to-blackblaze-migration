# Multi-stage Dockerfile for OneDrive to Backblaze B2 Migration App

# Stage 1: Build the React frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/client

# Accept build arguments for frontend environment variables
ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

# Copy client package files
COPY client/package*.json ./

# Install ALL dependencies (including dev dependencies needed for build)
RUN npm ci

# Copy client source code
COPY client/ ./

# Build the frontend
RUN npm run build

# Stage 2: Setup backend with Rclone
FROM node:18-alpine AS backend-base

# Install necessary system dependencies
RUN apk add --no-cache \
    curl \
    unzip \
    ca-certificates

# Install Rclone
RUN curl -O https://downloads.rclone.org/rclone-current-linux-amd64.zip && \
    unzip rclone-current-linux-amd64.zip && \
    mv rclone-*-linux-amd64/rclone /usr/local/bin/ && \
    chmod +x /usr/local/bin/rclone && \
    rm -rf rclone-*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install backend dependencies
RUN npm ci --only=production

# Copy backend source code
COPY server/ ./server/
COPY *.js ./
COPY *.md ./
COPY *.bat ./
COPY *.sh ./
COPY rclone.conf.example ./

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/client/dist ./client/dist

# Create necessary directories
RUN mkdir -p /app/logs /app/config /app/data

# Set proper permissions
RUN chmod +x /usr/local/bin/rclone

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Change ownership of app directory
RUN chown -R appuser:appgroup /app

USER appuser

# Expose the port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "server.js"]
