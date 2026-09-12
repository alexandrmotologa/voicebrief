# VoiceBrief Architecture

VoiceBrief is an audio processing pipeline and Telegram Mini App designed to transcribe voice notes, extract structured action items and summaries, and provide synchronized playback in an interactive interface.

## System overview

The system operates across three tiers:
1. Telegram Bot (ingestion layer via long polling)
2. Fastify backend (transcoding, transcription, structured LLM extraction, and SQLite persistence)
3. React Mini App (waveform player, checklist synchronization, and keyword search)

```
+-------------------------------------------------------------+
|                     Telegram Client                         |
|   (User forwards voice note .oga or opens Telegram Mini App)|
+------------------------------+------------------------------+
                               |
               Voice Note (.oga) / Mini App (HTTP)
                               |
                               v
+-------------------------------------------------------------+
|                      Fastify Server                         |
|  - Ingestion & Routing (/api/notes, /api/audio, /api/actions) |
|  - grammY Bot (Long Polling updates)                        |
|  - Telegram initData HMAC validation                        |
+--------------+-------------------------------+--------------+
               |                               |
        Audio file                       Note records
               v                               v
+-----------------------------+ +-----------------------------+
|      FFmpeg Converter       | |       SQLite Database       |
|  - Convert Opus to MP3      | |  - notes & audio metadata   |
|  - Extract duration & peaks | |  - transcript segments      |
+--------------+--------------+ |  - action items (checklist) |
               |                |  - key decisions            |
         Converted MP3          +-----------------------------+
               v                               ^
+-----------------------------+                |
|         AI Engine           |                |
|  - Groq / OpenAI Whisper    +----------------+
|  - LLM Structured Extractor | (Persists structured summary)
+-----------------------------+
```

## Data flow

### 1. Ingestion
When a user forwards a voice message to the Telegram bot:
- The bot acknowledges receipt with an initial status message: "Transcribing audio..."
- The bot retrieves the file URL using the Telegram Bot API `getFile` endpoint and downloads the `.oga` (Opus) payload to local disk.

### 2. Audio transcoding
Telegram voice notes use the Opus codec inside an Ogg container. Browsers and Whisper APIs prefer standardized MP3 or WAV formats:
- FFmpeg processes the `.oga` file into an MP3 stream.
- An analytical pass samples audio amplitudes across 64 bins to generate normalized waveform peak points (values between 0.05 and 1.0).
- The resulting MP3 and peak array are stored locally under the configured audio storage path.

### 3. Transcription and speaker segmentation
- The MP3 is passed to the configured transcriber (`groq` for sub-second latency, `openai` for baseline Whisper, or `mock` in demo mode).
- The transcriber returns timestamped word and sentence segments:
  ```json
  [
    { "start": 0.0, "end": 3.4, "speaker": "Alex", "text": "Let's review the deployment schedule for next week." },
    { "start": 3.5, "end": 7.2, "speaker": "Elena", "text": "Frontend builds are green, but we need API rate limiting first." }
  ]
  ```

### 4. Structured information extraction
The raw transcript text is forwarded to the summarizer engine, which prompts the LLM to output a JSON schema containing:
- 3 to 4 executive bullet points (TL;DR)
- Action items containing a task description, assignee, deadline, priority (high, medium, low), and completion status
- Key decisions reached during the conversation

### 5. Notification and Mini App launch
- The structured payload is written to the SQLite database.
- The bot edits its original Telegram message, displaying the formatted TL;DR, action item count, and an inline web app button.
- Clicking the button launches the Mini App inside Telegram, passing the note ID.

### 6. Interactive synchronization
Inside the Mini App:
- The audio player loads the MP3 from `/api/audio/:id` and renders the waveform from precomputed peaks.
- As audio plays, the active transcript segment is highlighted in real time.
- Clicking any sentence jumps the player to that timestamp.
- Toggling an action item triggers a `PATCH /api/actions/:id/toggle` request, updating SQLite instantly.
