# Multi-stage build for production optimization
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies, including dev dependencies for building
RUN npm ci && npm cache clean --force

# Copy application code for build
COPY . .

# Build and obfuscate code
RUN npm install -g javascript-obfuscator uglify-js terser
RUN mkdir -p /app/dist

# Obfuscate and minify backend code - use only supported options
RUN for file in $(find ./src -type f -name "*.js" -not -path "*/node_modules/*"); do \
    echo "Processing $file..."; \
    javascript-obfuscator $file --output /app/dist/${file#./} \
    --compact true \
    --control-flow-flattening true \
    --dead-code-injection true \
    --debug-protection true \
    --disable-console-output true \
    --identifier-names-generator hexadecimal \
    --log false \
    --rename-globals true \
    --self-defending true \
    --shuffle-string-array true \
    --split-strings true \
    --string-array true \
    --transform-object-keys true \
    --unicode-escape-sequence true; \
    done

# Minify frontend JS files
RUN for file in $(find ./src/public -type f -name "*.js" -not -path "*/node_modules/*"); do \
    echo "Processing frontend $file..."; \
    mkdir -p /app/dist/$(dirname ${file#./}); \
    terser $file -c -m --toplevel --output /app/dist/${file#./}; \
    done

# Copy non-JS files directly
RUN find ./src -type f -not -name "*.js" | xargs -I{} cp --parents {} /app/dist/

# Copy package files to dist
COPY package*.json /app/dist/

# Production stage
FROM node:18-alpine AS runtime

# Install additional security packages
RUN apk add --no-cache dumb-init tzdata

# Create app user
RUN addgroup -g 1001 -S nodejs && \
  adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy obfuscated code from builder stage
COPY --from=builder /app/dist/package*.json ./
COPY --from=builder /app/dist/src ./src

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Create necessary directories with proper ownership
RUN mkdir -p logs uploads data && \
  chown -R nodejs:nodejs logs uploads data

# Set file permissions to restrict access
RUN chmod -R 750 /app && \
  chmod -R 770 logs uploads data

# Set environment variables
ENV NODE_ENV=production \
    NODE_OPTIONS=--max-old-space-size=512 \
    PM2_HOME=/tmp

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Use dumb-init as entry point to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start application
CMD ["npm", "start"]