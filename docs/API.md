# VoiceBrief REST API

The VoiceBrief server exposes a Fastify REST API consumed by the Telegram Mini App and external tools.

## Base URL
```
http://localhost:8080/api
```

## Authentication
When running inside Telegram, requests include an `x-telegram-init-data` header. The server validates the HMAC-SHA256 signature against the bot token. In development mode or when `DEMO_MODE=true`, authorization checks pass automatically.

---

## Endpoints

### 1. List recent notes
Retrieve a list of processed voice notes.

- **URL:** `GET /api/notes`
- **Query parameters:**
  - `limit` (optional, default: 20): Maximum records to return.
- **Response: `200 OK`**
  ```json
  [
    {
      "id": "note_01h9a8b7c6",
      "title": "Product Launch Sync & Action Items",
      "durationSec": 165,
      "tldr": [
        "Mobile release shifted to next Tuesday.",
        "Stripe webhook integration complete."
      ],
      "actionItemsCount": 4,
      "completedCount": 1,
      "createdAt": "2026-09-12T14:30:00.000Z"
    }
  ]
  ```

---

### 2. Get note details
Retrieve full details for a note, including transcript segments, action items, and key decisions.

- **URL:** `GET /api/notes/:id`
- **Response: `200 OK`**
  ```json
  {
    "id": "note_01h9a8b7c6",
    "title": "Product Launch Sync & Action Items",
    "durationSec": 165,
    "waveformPeaks": [0.12, 0.45, 0.88, 0.32, 0.15],
    "tldr": [
      "Mobile release shifted to next Tuesday.",
      "Stripe webhook integration complete.",
      "Design sign-off needed from Alex before code freeze."
    ],
    "actionItems": [
      {
        "id": "act_01",
        "task": "Update release notes on GitHub",
        "assignee": "Alex",
        "deadline": "Monday 10:00 AM",
        "priority": "high",
        "completed": false
      },
      {
        "id": "act_02",
        "task": "Run end-to-end checkout tests on iOS staging",
        "assignee": "Elena",
        "deadline": "Tuesday 2:00 PM",
        "priority": "medium",
        "completed": true
      }
    ],
    "keyDecisions": [
      "Release date confirmed for next Tuesday.",
      "Postpone dark mode v2 to patch release."
    ],
    "segments": [
      {
        "id": "seg_01",
        "start": 0.0,
        "end": 4.2,
        "speaker": "Alex",
        "text": "Hey team, quick sync on the launch timeline."
      }
    ],
    "rawText": "Hey team, quick sync on the launch timeline...",
    "createdAt": "2026-09-12T14:30:00.000Z"
  }
  ```

---

### 3. Get demo note
Returns a pre-populated note payload for zero-configuration testing.

- **URL:** `GET /api/notes/demo`
- **Response: `200 OK`**
  Returns complete `VoiceAnalysisResult` object populated with realistic multi-speaker engineering sync data.

---

### 4. Stream audio
Streams converted audio for browser playback with byte-range support.

- **URL:** `GET /api/audio/:id`
- **Headers:** `Range: bytes=0-` (optional)
- **Response: `200 OK` or `206 Partial Content`**
  - Content-Type: `audio/mpeg`
  - Accept-Ranges: `bytes`

---

### 5. Toggle action item completion
Updates the completion state of a specific action item.

- **URL:** `PATCH /api/actions/:id/toggle`
- **Response: `200 OK`**
  ```json
  {
    "id": "act_01",
    "completed": true,
    "updatedAt": "2026-09-12T14:35:00.000Z"
  }
  ```

---

### 6. Create custom action item
Appends an action item to an existing note.

- **URL:** `POST /api/actions`
- **Body:**
  ```json
  {
    "noteId": "note_01h9a8b7c6",
    "task": "Review telemetry metrics after deploy",
    "assignee": "David",
    "priority": "medium",
    "deadline": "Wednesday"
  }
  ```
- **Response: `201 Created`**
  Returns the created action item record.

---

### 7. Direct audio upload
Allows manual testing via web drag-and-drop or curl without Telegram.

- **URL:** `POST /api/upload`
- **Content-Type:** `multipart/form-data`
- **Body field:** `file` (binary audio file)
- **Response: `200 OK`**
  Returns the complete analyzed note structure.
