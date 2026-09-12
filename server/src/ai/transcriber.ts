import fs from 'fs';
import { getMockSyncAnalysis } from './mockAi.js';

export interface TranscriptSegment {
  id: string;
  start: number;
  end: number;
  speaker: string;
  text: string;
}

export interface TranscriptionResult {
  rawText: string;
  segments: TranscriptSegment[];
}

export async function transcribeAudio(
  filePath: string,
  provider = process.env.AI_TRANSCRIBER || 'groq'
): Promise<TranscriptionResult> {
  const isDemo = process.env.DEMO_MODE === 'true';

  if (isDemo || provider === 'mock') {
    const mock = getMockSyncAnalysis();
    return {
      rawText: mock.rawText,
      segments: mock.segments.map((s, idx) => ({
        id: `seg_${idx + 1}`,
        start: s.start,
        end: s.end,
        speaker: s.speaker,
        text: s.text,
      })),
    };
  }

  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (provider === 'groq' && groqKey) {
    try {
      return await callWhisperApi({
        apiUrl: 'https://api.groq.com/openai/v1/audio/transcriptions',
        apiKey: groqKey,
        model: 'whisper-large-v3-turbo',
        filePath,
      });
    } catch (err) {
      console.warn('Groq transcription failed, falling back to mock:', err);
    }
  }

  if (openaiKey) {
    try {
      return await callWhisperApi({
        apiUrl: 'https://api.openai.com/v1/audio/transcriptions',
        apiKey: openaiKey,
        model: 'whisper-1',
        filePath,
      });
    } catch (err) {
      console.warn('OpenAI transcription failed, falling back to mock:', err);
    }
  }

  // Fallback to mock if keys missing or call failed
  const mock = getMockSyncAnalysis();
  return {
    rawText: mock.rawText,
    segments: mock.segments.map((s, idx) => ({
      id: `seg_${idx + 1}`,
      start: s.start,
      end: s.end,
      speaker: s.speaker,
      text: s.text,
    })),
  };
}

interface WhisperApiParams {
  apiUrl: string;
  apiKey: string;
  model: string;
  filePath: string;
}

interface WhisperApiResponse {
  text: string;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

async function callWhisperApi({
  apiUrl,
  apiKey,
  model,
  filePath,
}: WhisperApiParams): Promise<TranscriptionResult> {
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: 'audio/mpeg' });

  const formData = new FormData();
  formData.append('file', blob, 'audio.mp3');
  formData.append('model', model);
  formData.append('response_format', 'verbose_json');

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Whisper API error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as WhisperApiResponse;
  const rawText = data.text || '';

  if (Array.isArray(data.segments) && data.segments.length > 0) {
    const segments: TranscriptSegment[] = data.segments.map((s, idx) => ({
      id: `seg_${idx + 1}`,
      start: Math.round(s.start * 10) / 10,
      end: Math.round(s.end * 10) / 10,
      speaker: 'Speaker',
      text: s.text.trim(),
    }));

    return { rawText, segments };
  }

  // Synthesize segment if verbose_json not returned
  return {
    rawText,
    segments: [
      {
        id: 'seg_1',
        start: 0,
        end: 30,
        speaker: 'Speaker',
        text: rawText,
      },
    ],
  };
}
