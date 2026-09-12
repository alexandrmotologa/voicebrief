import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { getDatabase } from './db/database.js';
import { saveNote, listNotes } from './db/queries.js';
import { getMockSyncAnalysis } from './ai/mockAi.js';
import { generateWaveformPeaks } from './audio/converter.js';
import { registerNoteRoutes } from './routes/noteApi.js';
import { registerAudioRoutes } from './routes/audioApi.js';
import { initTelegramBot, startBotLongPolling, stopTelegramBot } from './bot/bot.js';

// Resolve directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root or server directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const port = parseInt(process.env.PORT || '8080', 10);
const host = process.env.HOST || '0.0.0.0';

async function bootstrap(): Promise<void> {
  // 1. Initialize SQLite Database
  const db = getDatabase();
  console.log('SQLite database initialized.');

  // 2. Ensure initial demo note is seeded if database is empty
  const existing = listNotes(1);
  if (existing.length === 0) {
    const mock = getMockSyncAnalysis();
    saveNote({
      id: 'demo',
      title: mock.title,
      durationSec: mock.durationSec,
      audioPath: path.resolve(__dirname, '../assets/demo.mp3'),
      waveformPeaks: generateWaveformPeaks(64, 'demo'),
      rawText: mock.rawText,
      tldr: mock.tldr,
      keyDecisions: mock.keyDecisions,
      segments: mock.segments,
      actionItems: mock.actionItems,
    });
    console.log('Seeded default demo note into SQLite.');
  }

  // 3. Create Fastify Server
  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'warn',
    },
  });

  await fastify.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'x-telegram-init-data'],
    exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'],
  });

  await fastify.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB max upload
    },
  });

  // 4. Register API Routes
  await registerNoteRoutes(fastify);
  await registerAudioRoutes(fastify);

  // Health check endpoint
  fastify.get('/api/health', async () => ({
    status: 'ok',
    service: 'voicebrief',
    timestamp: new Date().toISOString(),
  }));

  // 5. Serve React Mini App static build if available
  const clientDistPaths = [
    path.resolve(__dirname, '../../web/dist'),
    path.resolve(__dirname, '../web/dist'),
    path.resolve(process.cwd(), 'web/dist'),
  ];

  const clientDist = clientDistPaths.find((p) => fs.existsSync(p));
  if (clientDist) {
    await fastify.register(fastifyStatic, {
      root: clientDist,
      prefix: '/',
    });

    fastify.setNotFoundHandler((request, reply) => {
      if (request.raw.url && request.raw.url.startsWith('/api')) {
        return reply.status(404).send({ error: 'Endpoint not found' });
      }
      return reply.sendFile('index.html');
    });

    console.log(`Serving static web assets from ${clientDist}`);
  }

  // 6. Start Telegram Bot if configured
  const bot = initTelegramBot();
  if (bot) {
    startBotLongPolling();
  }

  // 7. Start HTTP Server
  try {
    await fastify.listen({ port, host });
    console.log(`VoiceBrief server running on http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const signals = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      console.log(`Received ${signal}, shutting down gracefully...`);
      stopTelegramBot();
      await fastify.close();
      process.exit(0);
    });
  }
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
