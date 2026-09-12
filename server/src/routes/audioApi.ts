import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fs from 'fs';
import path from 'path';
import { getNoteById } from '../db/queries.js';

export async function registerAudioRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/audio/:id - Stream MP3 audio with Range header support
  fastify.get('/api/audio/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string };
    const id = params.id;

    let targetPath: string | null = null;

    if (id === 'demo') {
      const demoPath = path.join(process.cwd(), 'server', 'assets', 'demo.mp3');
      const rootDemoPath = path.join(process.cwd(), 'assets', 'demo.mp3');
      if (fs.existsSync(demoPath)) {
        targetPath = demoPath;
      } else if (fs.existsSync(rootDemoPath)) {
        targetPath = rootDemoPath;
      }
    } else {
      const storageDir = process.env.AUDIO_STORAGE_PATH || path.join(process.cwd(), 'data', 'audio');
      const directPath = path.join(storageDir, `${id}.mp3`);
      if (fs.existsSync(directPath)) {
        targetPath = directPath;
      } else {
        const note = getNoteById(id);
        if (note) {
          const demoPath = path.join(process.cwd(), 'server', 'assets', 'demo.mp3');
          if (fs.existsSync(demoPath)) {
            targetPath = demoPath;
          }
        }
      }
    }

    if (!targetPath || !fs.existsSync(targetPath)) {
      return reply.status(404).send({ error: 'Audio stream not found' });
    }

    const stat = fs.statSync(targetPath);
    const fileSize = stat.size;
    const range = request.headers.range;

    if (range) {
      // Byte range request (HTTP 206)
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(targetPath, { start, end });

      return reply
        .status(206)
        .header('Content-Range', `bytes ${start}-${end}/${fileSize}`)
        .header('Accept-Ranges', 'bytes')
        .header('Content-Length', chunkSize)
        .header('Content-Type', 'audio/mpeg')
        .send(fileStream);
    }

    // Standard HTTP 200 streaming
    const fileStream = fs.createReadStream(targetPath);
    return reply
      .status(200)
      .header('Content-Length', fileSize)
      .header('Content-Type', 'audio/mpeg')
      .header('Accept-Ranges', 'bytes')
      .send(fileStream);
  });
}
