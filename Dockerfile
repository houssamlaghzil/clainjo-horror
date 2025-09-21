# Multi-stage Dockerfile: build frontend with Vite, run Node server that serves the build and Socket.IO

# ---------- Builder: installs deps and builds React app ----------
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ---------- Runner: production image with only server + built assets ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

# Install only production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy server code and build artifacts
COPY server ./server
COPY --from=builder /app/dist ./dist

# Expose server port
EXPOSE 4000

# Start the server (serves dist and Socket.IO)
CMD ["npm", "start"]

# Basic healthcheck to ensure the server responds
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/ > /dev/null || exit 1
