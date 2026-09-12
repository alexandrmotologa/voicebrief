import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  listNotes,
  getNoteById,
  toggleActionItem,
  addActionItem,
  deleteActionItem,
  saveNote,
  NoteDetailsDTO,
} from '../db/queries.js';
import { getMockSyncAnalysis } from '../ai/mockAi.js';
import { generateWaveformPeaks, convertToMp3, getAudioDuration, sliceAudioSnippet } from '../audio/converter.js';
import { transcribeAudio } from '../ai/transcriber.js';
import { summarizeTranscript } from '../ai/summarizer.js';
import { answerQuestionAboutNote } from '../ai/qa.js';
import { translateNoteContent } from '../ai/translator.js';

export async function registerNoteRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/notes - List notes
  fastify.get('/api/notes', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as { limit?: string };
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const notes = listNotes(limit);

    // If database is empty, provide demo note entry in list
    if (notes.length === 0) {
      const demo = getMockSyncAnalysis();
      return reply.send([
        {
          id: 'demo',
          title: demo.title,
          durationSec: demo.durationSec,
          tldr: demo.tldr,
          actionItemsCount: demo.actionItems.length,
          completedCount: demo.actionItems.filter((a) => a.completed).length,
          createdAt: new Date().toISOString(),
        },
      ]);
    }

    return reply.send(notes);
  });

  // GET /api/notes/demo - Get demo note
  fastify.get('/api/notes/demo', async (_request: FastifyRequest, reply: FastifyReply) => {
    const mock = getMockSyncAnalysis();
    const demoPayload: NoteDetailsDTO = {
      id: 'demo',
      title: mock.title,
      durationSec: mock.durationSec,
      audioUrl: '/api/audio/demo',
      waveformPeaks: generateWaveformPeaks(64, 'demo'),
      tldr: mock.tldr,
      keyDecisions: mock.keyDecisions,
      tone: mock.tone || 'Action-oriented',
      sentiment: mock.sentiment || 'High Priority',
      actionItems: mock.actionItems.map((a, i) => ({
        id: `demo_act_${i + 1}`,
        task: a.task,
        assignee: a.assignee,
        deadline: a.deadline,
        priority: a.priority,
        completed: a.completed,
      })),
      segments: mock.segments.map((s, i) => ({
        id: `demo_seg_${i + 1}`,
        start: s.start,
        end: s.end,
        speaker: s.speaker,
        text: s.text,
      })),
      rawText: mock.rawText,
      createdAt: new Date().toISOString(),
    };

    return reply.send(demoPayload);
  });

  // GET /api/notes/:id - Get specific note
  fastify.get('/api/notes/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string };
    const id = params.id;

    if (id === 'demo') {
      const mock = getMockSyncAnalysis();
      return reply.send({
        id: 'demo',
        title: mock.title,
        durationSec: mock.durationSec,
        audioUrl: '/api/audio/demo',
        waveformPeaks: generateWaveformPeaks(64, 'demo'),
        tldr: mock.tldr,
        keyDecisions: mock.keyDecisions,
        tone: mock.tone || 'Action-oriented',
        sentiment: mock.sentiment || 'High Priority',
        actionItems: mock.actionItems.map((a, i) => ({
          id: `demo_act_${i + 1}`,
          task: a.task,
          assignee: a.assignee,
          deadline: a.deadline,
          priority: a.priority,
          completed: a.completed,
        })),
        segments: mock.segments.map((s, i) => ({
          id: `demo_seg_${i + 1}`,
          start: s.start,
          end: s.end,
          speaker: s.speaker,
          text: s.text,
        })),
        rawText: mock.rawText,
        createdAt: new Date().toISOString(),
      });
    }

    const note = getNoteById(id);
    if (!note) {
      return reply.status(404).send({ error: 'Note not found' });
    }

    return reply.send(note);
  });

  // POST /api/notes/:id/ask - Chat with Voice Note (Q&A)
  fastify.post('/api/notes/:id/ask', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string };
    const body = request.body as { question: string };

    if (!body || !body.question || !body.question.trim()) {
      return reply.status(400).send({ error: 'question is required' });
    }

    let rawText = '';
    let segments: Array<{ start: number; end: number; speaker: string; text: string }> = [];

    if (params.id === 'demo') {
      const mock = getMockSyncAnalysis();
      rawText = mock.rawText;
      segments = mock.segments;
    } else {
      const note = getNoteById(params.id);
      if (!note) {
        return reply.status(404).send({ error: 'Note not found' });
      }
      rawText = note.rawText;
      segments = note.segments;
    }

    const qaResult = await answerQuestionAboutNote(body.question.trim(), rawText, segments);
    return reply.send(qaResult);
  });

  // POST /api/notes/:id/clip - Slice and share audio segment
  fastify.post('/api/notes/:id/clip', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string };
    const body = request.body as { start: number; end: number; label?: string };

    if (!body || typeof body.start !== 'number' || typeof body.end !== 'number' || body.end <= body.start) {
      return reply.status(400).send({ error: 'Valid start and end seconds are required' });
    }

    const storageDir = process.env.AUDIO_STORAGE_PATH || path.join(process.cwd(), 'data', 'audio');
    const clipsDir = path.join(storageDir, 'clips');
    if (!fs.existsSync(clipsDir)) {
      fs.mkdirSync(clipsDir, { recursive: true });
    }

    let sourceAudioPath = '';
    if (params.id === 'demo') {
      sourceAudioPath = path.join(process.cwd(), 'server', 'assets', 'demo.mp3');
      if (!fs.existsSync(sourceAudioPath)) {
        sourceAudioPath = path.join(process.cwd(), 'assets', 'demo.mp3');
      }
    } else {
      sourceAudioPath = path.join(storageDir, `${params.id}.mp3`);
      if (!fs.existsSync(sourceAudioPath)) {
        sourceAudioPath = path.join(process.cwd(), 'server', 'assets', 'demo.mp3');
      }
    }

    const clipId = `clip_${params.id}_${Math.round(body.start)}_${Math.round(body.end)}_${crypto.randomBytes(4).toString('hex')}`;
    const clipFilename = `${clipId}.mp3`;
    const outputPath = path.join(clipsDir, clipFilename);

    try {
      await sliceAudioSnippet(sourceAudioPath, body.start, body.end, outputPath);
      const durationSec = Math.round(body.end - body.start);

      return reply.send({
        clipId,
        clipUrl: `/api/audio/clips/${clipFilename}`,
        durationSec,
        startSec: body.start,
        endSec: body.end,
      });
    } catch (err) {
      return reply.status(500).send({
        error: `Failed to create audio clip: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    }
  });

  // POST /api/notes/:id/translate - Translate note summary and segments
  fastify.post('/api/notes/:id/translate', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string };
    const body = request.body as { targetLanguage: 'en' | 'ro' | 'es' | 'de' };

    const targetLang = body?.targetLanguage || 'en';

    let baseNote: NoteDetailsDTO | null = null;
    if (params.id === 'demo') {
      const mock = getMockSyncAnalysis();
      baseNote = {
        id: 'demo',
        title: mock.title,
        durationSec: mock.durationSec,
        audioUrl: '/api/audio/demo',
        waveformPeaks: generateWaveformPeaks(64, 'demo'),
        tldr: mock.tldr,
        keyDecisions: mock.keyDecisions,
        actionItems: mock.actionItems.map((a, i) => ({
          id: `demo_act_${i + 1}`,
          task: a.task,
          assignee: a.assignee,
          deadline: a.deadline,
          priority: a.priority,
          completed: a.completed,
        })),
        segments: mock.segments.map((s, i) => ({
          id: `demo_seg_${i + 1}`,
          start: s.start,
          end: s.end,
          speaker: s.speaker,
          text: s.text,
        })),
        rawText: mock.rawText,
        tone: mock.tone,
        sentiment: mock.sentiment,
        createdAt: new Date().toISOString(),
      };
    } else {
      baseNote = getNoteById(params.id);
    }

    if (!baseNote) {
      return reply.status(404).send({ error: 'Note not found' });
    }

    const translated = await translateNoteContent(baseNote, targetLang);
    return reply.send(translated);
  });

  // PATCH /api/actions/:id/toggle - Toggle action item
  fastify.patch('/api/actions/:id/toggle', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string };
    const id = params.id;

    if (id.startsWith('demo_act_')) {
      return reply.send({
        id,
        completed: true,
        updatedAt: new Date().toISOString(),
      });
    }

    const updated = toggleActionItem(id);
    if (!updated) {
      return reply.status(404).send({ error: 'Action item not found' });
    }

    return reply.send({
      id: updated.id,
      completed: updated.completed,
      updatedAt: new Date().toISOString(),
    });
  });

  // POST /api/actions - Add custom action item
  fastify.post('/api/actions', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as {
      noteId: string;
      task: string;
      assignee?: string;
      deadline?: string;
      priority?: string;
    };

    if (!body || !body.noteId || !body.task) {
      return reply.status(400).send({ error: 'noteId and task are required' });
    }

    if (body.noteId === 'demo') {
      return reply.status(201).send({
        id: `demo_act_${Date.now()}`,
        task: body.task,
        assignee: body.assignee,
        deadline: body.deadline,
        priority: body.priority || 'medium',
        completed: false,
      });
    }

    const created = addActionItem(body);
    return reply.status(201).send(created);
  });

  // DELETE /api/actions/:id - Remove action item
  fastify.delete('/api/actions/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { id: string };
    const success = deleteActionItem(params.id);
    if (!success && !params.id.startsWith('demo_act_')) {
      return reply.status(404).send({ error: 'Action item not found' });
    }
    return reply.send({ success: true, id: params.id });
  });

  // POST /api/upload - Direct audio upload (web UI testing)
  fastify.post('/api/upload', async (request: FastifyRequest, reply: FastifyReply) => {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    const storageDir = process.env.AUDIO_STORAGE_PATH || path.join(process.cwd(), 'data', 'audio');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const noteId = `note_${crypto.randomBytes(6).toString('hex')}`;
    const rawFilename = `upload_${noteId}_${data.filename}`;
    const rawPath = path.join(storageDir, rawFilename);
    const mp3Path = path.join(storageDir, `${noteId}.mp3`);

    const writeStream = fs.createWriteStream(rawPath);
    await data.file.pipe(writeStream);

    try {
      await convertToMp3(rawPath, mp3Path);
      try {
        fs.unlinkSync(rawPath);
      } catch {
        // ignore
      }

      const durationSec = await getAudioDuration(mp3Path);
      const peaks = generateWaveformPeaks(64, noteId);

      const trResult = await transcribeAudio(mp3Path);
      const summary = await summarizeTranscript(trResult.rawText);

      saveNote({
        id: noteId,
        title: summary.title || data.filename,
        durationSec,
        audioPath: mp3Path,
        waveformPeaks: peaks,
        rawText: trResult.rawText,
        tldr: summary.tldr,
        keyDecisions: summary.keyDecisions,
        segments: trResult.segments,
        actionItems: summary.actionItems,
      });

      const note = getNoteById(noteId);
      return reply.status(201).send(note);
    } catch (err) {
      return reply.status(500).send({
        error: `Audio processing failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    }
  });
}
