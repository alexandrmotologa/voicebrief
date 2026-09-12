# Telegram Setup Guide

This guide walks through creating the Telegram bot, configuring the Mini App menu button, and running VoiceBrief locally or in production.

## 1. Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/BotFather).
2. Send `/newbot`.
3. Choose a display name (for example, `VoiceBrief Assistant`).
4. Choose a unique username ending in `bot` (for example, `voicebrief_example_bot`).
5. Copy the generated HTTP API token.

---

## 2. Configure Environment Variables

Create `.env` inside the project root:

```bash
cp .env.example .env
```

Set your token:
```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxYZ
TELEGRAM_MINI_APP_URL=https://your-public-domain.com
DEMO_MODE=false
```

When testing locally without a public domain, you can keep `DEMO_MODE=true` to verify all playback, transcription, and checklist features directly in your browser.

---

## 3. Attach the Mini App Menu Button

To let users open the Mini App directly from the bot's chat interface:

1. In [@BotFather](https://t.me/BotFather), send `/mybots` and select your bot.
2. Select **Bot Settings** -> **Menu Button** -> **Configure menu button**.
3. Send the public URL hosting the web client (or your tunneling URL, such as Cloudflare Tunnel or ngrok).
4. Provide the button title: `Open VoiceBrief`.

---

## 4. How the Bot Interacts with Users

- **Forwarded voice note:** When a user forwards any `.oga` or `.ogg` voice note, the bot automatically converts the audio, runs transcription, extracts action items, and replies with a formatted summary.
- **Inline launch button:** The summary message includes an inline button that opens the interactive player and checklist for that specific note.
- **/start command:** Greets the user, shows basic instructions, and provides a direct link to the Mini App demo.
- **/demo command:** Immediately posts the sample product sync summary with an interactive Mini App link.
- **/history command:** Lists the last 5 transcribed voice notes with their completion status.
