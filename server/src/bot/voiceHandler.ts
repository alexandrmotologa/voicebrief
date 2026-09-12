import { Context, InlineKeyboard } from 'grammy';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { convertToMp3, getAudioDuration, generateWaveformPeaks } from '../audio/converter.js';
import { transcribeAudio } from '../ai/transcriber.js';
import { summarizeTranscript } from '../ai/summarizer.js';
import { saveNote } from '../db/queries.js';

export async function handleIncomingVoiceOrAudio(ctx: Context): Promise<void> {
  const isDemo = process.env.DEMO_MODE === 'true';
  const miniAppBaseUrl = process.env.TELEGRAM_MINI_APP_URL || 'http://localhost:8080';

  const voice = ctx.message?.voice;
  const audio = ctx.message?.audio;
  const document = ctx.message?.document;

  const fileId = voice?.file_id || audio?.file_id || document?.file_id;
  if (!fileId) {
    await ctx.reply('Please send or forward a valid voice note or audio file.');
    return;
  }

  // Send progressive status message
  const statusMsg = await ctx.reply('Transcribing voice note...');

  try {
    const storageDir = process.env.AUDIO_STORAGE_PATH || path.join(process.cwd(), 'data', 'audio');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const noteId = `note_${crypto.randomBytes(6).toString('hex')}`;
    const mp3Path = path.join(storageDir, `${noteId}.mp3`);

    let durationSec = voice?.duration || audio?.duration || 60;
    let peaks: number[] = [];
    let transcriptionText = '';
    let segments: Array<{ start: number; end: number; speaker?: string; text: string }> = [];

    if (!isDemo && ctx.api) {
      const fileInfo = await ctx.getFile();
      if (!fileInfo.file_path) {
        throw new Error('Could not retrieve file path from Telegram API');
      }

      const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${fileInfo.file_path}`;
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to download audio file: ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const tempInputPath = path.join(storageDir, `temp_${noteId}.oga`);
      fs.writeFileSync(tempInputPath, buffer);

      // Transcode Opus/OGA to MP3
      await convertToMp3(tempInputPath, mp3Path);
      // Clean up temporary raw input
      try {
        fs.unlinkSync(tempInputPath);
      } catch {
        // Ignore unlink error
      }

      durationSec = await getAudioDuration(mp3Path);
      peaks = generateWaveformPeaks(64, noteId);

      // Transcribe
      const trResult = await transcribeAudio(mp3Path);
      transcriptionText = trResult.rawText;
      segments = trResult.segments;
    } else {
      // In demo mode or if download skipped, copy bundled demo mp3
      const bundledDemo = path.join(process.cwd(), 'server', 'assets', 'demo.mp3');
      if (fs.existsSync(bundledDemo)) {
        fs.copyFileSync(bundledDemo, mp3Path);
      }
      durationSec = 165;
      peaks = generateWaveformPeaks(64, noteId);
      const trResult = await transcribeAudio(mp3Path, 'mock');
      transcriptionText = trResult.rawText;
      segments = trResult.segments;
    }

    // Progress update
    await ctx.api.editMessageText(
      ctx.chat!.id,
      statusMsg.message_id,
      'Extracting action items and key decisions...'
    );

    // Extract structured summary
    const summary = await summarizeTranscript(transcriptionText);

    // Save into SQLite
    saveNote({
      id: noteId,
      telegramChatId: ctx.chat?.id.toString(),
      userId: ctx.from?.id.toString(),
      title: summary.title,
      durationSec,
      audioPath: mp3Path,
      waveformPeaks: peaks,
      rawText: transcriptionText,
      tldr: summary.tldr,
      keyDecisions: summary.keyDecisions,
      segments,
      actionItems: summary.actionItems,
    });

    // Format human-readable output
    const minutes = Math.floor(durationSec / 60);
    const seconds = durationSec % 60;
    const formattedDuration = `${minutes}m ${seconds.toString().padStart(2, '0')}s`;

    let replyText = `VoiceBrief: ${summary.title} (${formattedDuration})\n\n`;

    replyText += `TL;DR:\n`;
    for (const bullet of summary.tldr) {
      replyText += `* ${bullet}\n`;
    }

    if (summary.actionItems.length > 0) {
      replyText += `\nAction Items (${summary.actionItems.length}):\n`;
      for (const item of summary.actionItems) {
        const checkbox = item.completed ? '[x]' : '[ ]';
        const assignee = item.assignee ? ` (@${item.assignee})` : '';
        const deadline = item.deadline ? ` - ${item.deadline}` : '';
        replyText += `${checkbox} ${item.task}${assignee}${deadline}\n`;
      }
    }

    if (summary.keyDecisions.length > 0) {
      replyText += `\nKey Decisions:\n`;
      for (const decision of summary.keyDecisions) {
        replyText += `* ${decision}\n`;
      }
    }

    const appUrl = `${miniAppBaseUrl}?noteId=${noteId}`;
    const keyboard = new InlineKeyboard().webApp('Open Interactive Player & Checklist', appUrl);

    await ctx.api.editMessageText(ctx.chat!.id, statusMsg.message_id, replyText, {
      reply_markup: keyboard,
    });
  } catch (error) {
    console.error('Error handling voice note:', error);
    await ctx.api.editMessageText(
      ctx.chat!.id,
      statusMsg.message_id,
      `Could not process voice note: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
