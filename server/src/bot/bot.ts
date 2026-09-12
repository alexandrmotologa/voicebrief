import { Bot, InlineKeyboard } from 'grammy';
import { handleIncomingVoiceOrAudio } from './voiceHandler.js';
import { listNotes } from '../db/queries.js';

let botInstance: Bot | null = null;

export function initTelegramBot(): Bot | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const isDemo = process.env.DEMO_MODE === 'true';

  if (!token || token === 'mock_token' || token === 'your_bot_token_from_botfather') {
    if (isDemo) {
      console.log('Running in DEMO_MODE: Telegram Bot long polling disabled (no valid token provided).');
      return null;
    }
    console.warn('TELEGRAM_BOT_TOKEN not configured. Bot will not start.');
    return null;
  }

  const bot = new Bot(token);
  const miniAppUrl = process.env.TELEGRAM_MINI_APP_URL || 'http://localhost:8080';

  bot.command('start', async (ctx) => {
    const welcome =
      `VoiceBrief\n\n` +
      `Forward or send any voice note or audio file to this chat.\n` +
      `You will receive an instant summary, key decisions, and an interactive checklist.\n\n` +
      `Commands:\n` +
      `/demo - Launch interactive demo\n` +
      `/history - View recent notes\n` +
      `/help - Usage instructions`;

    const keyboard = new InlineKeyboard().webApp(
      'Open VoiceBrief Demo',
      `${miniAppUrl}?noteId=demo`
    );

    await ctx.reply(welcome, { reply_markup: keyboard });
  });

  bot.command('help', async (ctx) => {
    const help =
      `How to use VoiceBrief:\n\n` +
      `1. Record or forward a voice note to this bot.\n` +
      `2. VoiceBrief converts the audio, runs transcription, and extracts action items.\n` +
      `3. Tap "Open Interactive Player & Checklist" to scrub through the waveform and check off completed tasks.\n\n` +
      `You can also upload standard audio files (.mp3, .m4a, .wav).`;

    await ctx.reply(help);
  });

  bot.command('demo', async (ctx) => {
    const text =
      `VoiceBrief Demo: Product Launch Sync (2m 45s)\n\n` +
      `TL;DR:\n` +
      `* Mobile v1.4 release shifted to next Tuesday.\n` +
      `* Stripe webhook integration passed automated regression tests.\n` +
      `* Database migrations scheduled for Sunday at 02:00 UTC.\n\n` +
      `Action Items (4):\n` +
      `[ ] Update release notes on GitHub (@Alex)\n` +
      `[x] Run end-to-end checkout tests on iOS staging (@Elena)\n` +
      `[ ] Review Stripe webhook idempotency PR (@David)\n` +
      `[ ] Finalize customer support escalation runbook (@Elena)`;

    const keyboard = new InlineKeyboard().webApp(
      'Open Interactive Player & Checklist',
      `${miniAppUrl}?noteId=demo`
    );

    await ctx.reply(text, { reply_markup: keyboard });
  });

  bot.command('history', async (ctx) => {
    const notes = listNotes(5);
    if (notes.length === 0) {
      await ctx.reply('No voice notes recorded yet. Send or forward a voice note to begin.');
      return;
    }

    let message = `Recent Voice Notes:\n\n`;
    for (const note of notes) {
      const minutes = Math.floor(note.durationSec / 60);
      const seconds = note.durationSec % 60;
      message += `* ${note.title} (${minutes}m ${seconds}s)\n`;
      message += `  Actions: ${note.completedCount}/${note.actionItemsCount} completed\n\n`;
    }

    const keyboard = new InlineKeyboard().webApp(
      'Open VoiceBrief',
      `${miniAppUrl}`
    );

    await ctx.reply(message, { reply_markup: keyboard });
  });

  bot.on('message:voice', handleIncomingVoiceOrAudio);
  bot.on('message:audio', handleIncomingVoiceOrAudio);
  bot.on('message:document', handleIncomingVoiceOrAudio);

  bot.catch((err) => {
    console.error('Telegram bot error:', err);
  });

  botInstance = bot;
  return bot;
}

export function startBotLongPolling(): void {
  if (!botInstance) {
    return;
  }

  botInstance.start({
    onStart: (botInfo) => {
      console.log(`Telegram Bot @${botInfo.username} listening via long polling.`);
    },
  });
}

export function stopTelegramBot(): void {
  if (botInstance) {
    botInstance.stop();
    botInstance = null;
  }
}
