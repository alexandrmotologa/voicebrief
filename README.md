<p align="center">
  <img src="docs/images/logo.png?raw=true" alt="VoiceBrief Logo" width="140" style="border-radius: 28px;" />
</p>

<h1 align="center">VoiceBrief</h1>

<p align="center">
  <strong>Voice note intelligence & interactive audio playback for Telegram</strong>
</p>

<p align="center">
  <a href="https://github.com/alexandrmotologa/voicebrief/actions"><img src="https://img.shields.io/badge/CI-passing-10b981?style=flat-square&logo=githubactions&logoColor=white" alt="CI Status" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-v22+-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node Version" /></a>
  <a href="https://fastify.dev/"><img src="https://img.shields.io/badge/Fastify-5.x-000000?style=flat-square&logo=fastify&logoColor=white" alt="Fastify" /></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-18.3-61dafb?style=flat-square&logo=react&logoColor=black" alt="React" /></a>
  <a href="https://ffmpeg.org/"><img src="https://img.shields.io/badge/FFmpeg-Opus_%E2%86%92_MP3-007808?style=flat-square&logo=ffmpeg&logoColor=white" alt="FFmpeg" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License" /></a>
</p>

---

VoiceBrief is an audio transcription service and Telegram Mini App that turns voice notes into concise summaries, actionable checklists, and interactive transcripts with synchronized audio playback.

Users can forward any voice message to the Telegram bot to receive an immediate text overview, then launch the Mini App to scrub through the audio with sentence-by-sentence highlights and toggle completion on action items.

---

## Interface Preview

<div align="center">
  <table>
    <tr>
      <td align="center" width="50%">
        <strong>Executive Summary & Waveform Diarization</strong><br/><br/>
        <img src="docs/images/screenshot_summary.png?raw=true" alt="Executive Summary & Diarization" width="340" style="border-radius: 14px;" />
      </td>
      <td align="center" width="50%">
        <strong>Interactive Action Items & Calendar Export</strong><br/><br/>
        <img src="docs/images/screenshot_tasks.png?raw=true" alt="Action Items Checklist" width="340" style="border-radius: 14px;" />
      </td>
    </tr>
    <tr>
      <td align="center" width="50%">
        <strong>Synchronized Transcript & Audio Clipping</strong><br/><br/>
        <img src="docs/images/screenshot_transcript.png?raw=true" alt="Synchronized Transcript & Audio Clipping" width="340" style="border-radius: 14px;" />
      </td>
      <td align="center" width="50%">
        <strong>"Ask AI" Contextual Q&A with Citations</strong><br/><br/>
        <img src="docs/images/screenshot_chat.png?raw=true" alt="Ask AI Contextual Q&A" width="340" style="border-radius: 14px;" />
      </td>
    </tr>
  </table>
</div>

---

## Features

- **Voice note processing:** Ingests Telegram `.oga`/`.ogg` Opus voice messages, downsamples to 16 kHz mono, and transcodes to standard MP3 with automatic 64-peak amplitude profiling.
- **Waveform player with speaker diarization:** 64-bar visual scrub bar with color-coded speaker segments (Alex, Elena, David), playback rates (1x, 1.25x, 1.5x, 2x), and instant seek.
- **Interactive action items & calendar export:** Real-time priority checklist synced with SQLite. Exports deadlines directly to Google Calendar or downloads `.ics` files in 1 click.
- **Synchronized transcript & snippet clipping:** Highlights sentences during playback. Users can slice any spoken quote into an isolated MP3 clip with a dedicated player and shareable link.
- **"Ask AI" interactive Q&A:** Contextual chat allowing users to query voice note content (e.g. "When is the database migration?") with cited timestamps.
- **In-app voice recording:** Record audio directly inside the Mini App via browser MediaRecorder API without leaving the interface.
- **Live keyword search:** Real-time transcript filtering with match counts and seek-on-click navigation.
- **Multi-language translation:** Instant one-click translation switcher for summaries and decisions into Romanian, Spanish, and English.
- **Group chat compact mode & `/tldr`:** Optimized Telegram messages for group chats with expandable Mini App buttons.
- **Zero-domain demo mode:** Bundles a pre-transcribed engineering sync and 165-second audio track for instant testing without API keys.

---

## Architecture

VoiceBrief runs as a Node.js monorepo:

```
voicebrief/
├── server/               # Fastify backend, grammY bot, SQLite, and FFmpeg
│   ├── src/
│   │   ├── ai/          # Whisper transcribers and LLM summarizer
│   │   ├── audio/       # FFmpeg audio conversion and peak extraction
│   │   ├── bot/         # Telegram bot handlers (long polling)
│   │   ├── db/          # SQLite schema (node:sqlite) and queries
│   │   ├── routes/      # Fastify REST endpoints
│   │   └── index.ts     # Server entry point
│   └── package.json
├── web/                  # React 19 Mini App frontend
│   ├── src/
│   │   ├── components/  # WaveformPlayer, ActionItems, Transcript, Summary
│   │   ├── hooks/       # useAudioSync, useTelegram
│   │   └── App.tsx
│   └── package.json
├── docs/                 # System architecture, API, and pipeline docs
├── Dockerfile            # Multi-stage production container with FFmpeg
└── docker-compose.yml
```

Detailed technical specifications:
- [Architecture & Data Flow](docs/ARCHITECTURE.md)
- [REST API Reference](docs/API.md)
- [Audio & AI Pipeline](docs/PIPELINE.md)
- [Telegram Bot & Mini App Setup](docs/TELEGRAM_SETUP.md)

---

## Quick start

### Prerequisites
- Node.js 22+ (uses built-in `node:sqlite`)
- FFmpeg installed and available on `PATH`

### 1. Clone and install dependencies
```bash
git clone https://github.com/alexandrmotologa/voicebrief.git
cd voicebrief
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```

By default, `DEMO_MODE=true` is enabled. You can run and test the complete app without any API keys.

### 3. Start development servers
```bash
# Start backend API (port 8080)
npm run dev:server

# Start Vite frontend (port 5173, in a separate terminal)
npm run dev:web
```

Open `http://localhost:5173` in your browser to inspect the interactive Mini App.

### 4. Run automated tests
```bash
npm test
```

### 5. Build for production
```bash
npm run build
npm start
```

The Fastify backend serves both the REST API on `/api/*` and the compiled React Mini App on `/`.

---

## Docker deployment

Run VoiceBrief in an isolated container with FFmpeg pre-installed:

```bash
docker compose up --build -d
```

The service will be accessible on `http://localhost:8080`. Audio files and the SQLite database are preserved inside the `voicebrief_data` named volume.

---

## License

MIT (c) 2026 Alexander Motologa. See [LICENSE](LICENSE) for details.
