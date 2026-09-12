# Stage 1: Build Web Frontend & Server Backend
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root and package descriptors
COPY package.json ./
COPY server/package.json ./server/
COPY web/package.json ./web/

# Install dependencies across all workspaces
RUN npm install

# Copy source trees
COPY server/ ./server/
COPY web/ ./web/

# Build static frontend and TypeScript backend
RUN npm run build:web
RUN npm run build:server

# Stage 2: Production Runner with FFmpeg
FROM node:22-alpine AS runner

WORKDIR /app

# Install FFmpeg for audio transcoding
RUN apk add --no-cache ffmpeg

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
ENV DATABASE_PATH=/data/voicebrief.db
ENV AUDIO_STORAGE_PATH=/data/audio

# Copy package descriptors and install production-only dependencies
COPY package.json ./
COPY server/package.json ./server/
RUN npm install --omit=dev --workspace=server

# Copy built server and static web assets
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/web/dist ./web/dist

# Create storage volume directory
RUN mkdir -p /data/audio

EXPOSE 8080

VOLUME ["/data"]

CMD ["node", "server/dist/index.js"]
