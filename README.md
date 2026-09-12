# VoiceBrief

VoiceBrief is an audio transcription service and Telegram Mini App that turns voice notes into concise summaries, actionable checklists, and interactive transcripts with synchronized audio playback.

Users can forward any voice message to the Telegram bot to receive an immediate text overview, then launch the Mini App to scrub through the audio with sentence-by-sentence highlights and toggle completion on action items.

```
+-------------------------------------------------------------------------+
|                              VoiceBrief                                 |
|                                                                         |
|  [||||||||||||||||||||||||||||||||||||||||||||||||||||||||||] 01:24/02:45 |
|  [> Play]  [1x] [1.25x] [1.5x] [2x]                                     |
|                                                                         |
|  Summary                Action Items (3)           Full Transcript      |
|  * Release Tuesday      [x] Deploy migrations      00:00 Alex: Review   |
|  * Stripe tested        [ ] Update documentation   00:15 Elena: Fixed   |
+-------------------------------------------------------------------------+
```

## Features

- **Voice note processing:** Ingests Telegram `.oga`/`.ogg` Opus voice messages, downsamples to 16 kHz mono, and transcodes to standard MP3.
- **Waveform audio player:** Visual amplitude scrub bar, custom playback speeds (1x, 1.25x, 1.5x, 2x), and instant seek.
- **Interactive checklist:** Tracks assignees, deadlines, and urgency levels. Checkbox clicks sync with SQLite in real time.
- **Synchronized transcript:** Highlights sentences as audio plays. Clicking any sentence jumps the player to that timestamp.
- **Keyword search:** Instant in-transcript search with match counts and seek-on-click.
- **Zero-domain demo mode:** Bundles a pre-transcribed engineering sync and audio file for local testing without Telegram bot tokens or AI API keys.
- **Dual AI adapters:** Plug-and-play support for Groq Whisper, OpenAI Whisper, and local mock generation.

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
