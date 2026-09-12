import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';

let dbInstance: DatabaseSync | null = null;

export function getDatabase(customPath?: string): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  const targetPath =
    customPath ||
    process.env.DATABASE_PATH ||
    path.join(process.cwd(), 'data', 'voicebrief.db');

  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new DatabaseSync(targetPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      telegram_chat_id TEXT,
      user_id TEXT,
      title TEXT NOT NULL,
      duration_sec INTEGER NOT NULL,
      audio_path TEXT,
      waveform_peaks TEXT,
      raw_text TEXT,
      tldr TEXT,
      key_decisions TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS segments (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      start_sec REAL NOT NULL,
      end_sec REAL NOT NULL,
      speaker TEXT,
      text TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS action_items (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      task TEXT NOT NULL,
      assignee TEXT,
      deadline TEXT,
      priority TEXT DEFAULT 'medium',
      completed INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_segments_note_id ON segments(note_id);
    CREATE INDEX IF NOT EXISTS idx_action_items_note_id ON action_items(note_id);
    CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);
  `);

  dbInstance = db;
  return dbInstance;
}

export function resetDatabaseInstance(): void {
  dbInstance = null;
}
