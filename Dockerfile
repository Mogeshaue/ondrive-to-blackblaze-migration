# Multi-stage build for production
FROM node:18-alpine as client-builder

# Set working directory for client build
WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./

# Install client dependencies
RUN npm ci --only=production

# Copy client source
COPY client/ ./

# Build client for production
RUN npm run build

# Production stage
FROM node:18-alpine

# Install rclone
RUN apk add --no-cache wget unzip
RUN wget https://downloads.rclone.org/v1.71.0/rclone-v1.71.0-linux-amd64.zip && \
    unzip rclone-v1.71.0-linux-amd64.zip && \
    mv rclone-v1.71.0-linux-amd64/rclone /usr/local/bin/ && \
    chmod +x /usr/local/bin/rclone && \
    rm -rf rclone-v1.71.0-linux-amd64*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy server source code
COPY server/ ./server/
COPY *.js ./
COPY config/ ./config/

# Copy built client from builder stage
COPY --from=client-builder /app/client/dist ./client/dist

# Create necessary directories
RUN mkdir -p data logs server/data server/logs

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "server.js"]
