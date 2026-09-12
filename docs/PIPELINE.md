# Audio Processing & AI Pipeline

VoiceBrief handles incoming audio in three sequential stages: transcoding, transcription with timestamping, and structured information extraction.

## 1. Audio Transcoding

Telegram delivers voice messages in Ogg containers using the Opus codec (`.oga` or `.ogg`). These files need conversion before sending them to transcription APIs or playing them in standard web views.

```
Telegram Voice (.oga/Opus) 
          |
     FFmpeg Stream
          |
  +-------+-------------------------+
  |                                 |
  v                                 v
MP3 Stream (128k CBR, 16kHz mono)  Waveform Peaks (64 normalized bins)
```

FFmpeg conversion parameters:
```bash
ffmpeg -i input.oga -vn -ar 16000 -ac 1 -b:a 128k output.mp3
```

- `-vn`: Strip any embedded album art or video tracks.
- `-ar 16000`: Downsample to 16,000 Hz, matching Whisper's internal processing rate and reducing payload size.
- `-ac 1`: Convert to single-channel mono.
- `-b:a 128k`: Standard bit rate balancing voice clarity with network transfer speed.

During conversion, the audio stream is also analyzed to extract 64 visual amplitude peaks. These peaks are stored as an array of floating-point numbers between 0.05 and 1.0, enabling instantaneous canvas rendering without running heavy client-side audio decoding.

---

## 2. Transcription Adapters

VoiceBrief supports three transcription backends configured via `AI_TRANSCRIBER`:

1. **Groq Whisper (`AI_TRANSCRIBER=groq`)**:
   Uses Groq's high-speed inference engine (`whisper-large-v3-turbo` or `distil-whisper`). Typical transcription turnaround is under 300 ms for a two-minute voice note.
2. **OpenAI Whisper (`AI_TRANSCRIBER=openai`)**:
   Uses the official OpenAI `whisper-1` API with full language detection and word-level timestamps.
3. **Mock Engine (`AI_TRANSCRIBER=mock` or `DEMO_MODE=true`)**:
   Returns pre-computed multi-speaker segments with exact timestamps matching the bundled demo audio file. This allows local development and automated testing without network access or API tokens.

Output data structure:
```typescript
export interface TranscriptSegment {
  id: string;
  start: number; // in seconds
  end: number;   // in seconds
  speaker: string;
  text: string;
}
```

---

## 3. Structured Information Extraction

Once raw text and segments are assembled, the summarizer sends the content to an LLM with strict JSON schema enforcement:

```typescript
export interface ExtractionSchema {
  tldr: string[]; // 3-4 bullet points
  actionItems: {
    task: string;
    assignee?: string;
    deadline?: string;
    priority: "high" | "medium" | "low";
  }[];
  keyDecisions: string[];
}
```

System prompt guidelines:
- Summarize only facts directly mentioned in the audio.
- Identify action items using active imperative verbs ("Deploy backend update", "Verify Stripe credentials").
- Tag assignees when a speaker specifically addresses an individual.
- Tag deadlines when relative days ("by Tuesday") or explicit dates are stated.
- Extract concrete decisions agreed upon by participants.
