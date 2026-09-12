import { getDatabase } from './database.js';
import crypto from 'crypto';

export interface NoteRecord {
  id: string;
  telegram_chat_id: string | null;
  user_id: string | null;
  title: string;
  duration_sec: number;
  audio_path: string | null;
  waveform_peaks: string | null;
  raw_text: string | null;
  tldr: string | null;
  key_decisions: string | null;
  created_at: string;
}

export interface SegmentRecord {
  id: string;
  note_id: string;
  start_sec: number;
  end_sec: number;
  speaker: string | null;
  text: string;
}

export interface ActionItemRecord {
  id: string;
  note_id: string;
  task: string;
  assignee: string | null;
  deadline: string | null;
  priority: string;
  completed: number;
  created_at: string;
}

export interface ActionItemDTO {
  id: string;
  task: string;
  assignee?: string;
  deadline?: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
}

export interface SegmentDTO {
  id: string;
  start: number;
  end: number;
  speaker: string;
  text: string;
}

export interface NoteDetailsDTO {
  id: string;
  telegramChatId?: string;
  title: string;
  durationSec: number;
  audioUrl: string;
  waveformPeaks: number[];
  tldr: string[];
  keyDecisions: string[];
  actionItems: ActionItemDTO[];
  segments: SegmentDTO[];
  rawText: string;
  createdAt: string;
}

export interface NoteListItemDTO {
  id: string;
  title: string;
  durationSec: number;
  tldr: string[];
  actionItemsCount: number;
  completedCount: number;
  createdAt: string;
}

export function saveNote(data: {
  id?: string;
  telegramChatId?: string;
  userId?: string;
  title: string;
  durationSec: number;
  audioPath?: string;
  waveformPeaks: number[];
  rawText: string;
  tldr: string[];
  keyDecisions: string[];
  segments: { start: number; end: number; speaker?: string; text: string }[];
  actionItems: { task: string; assignee?: string; deadline?: string; priority?: string; completed?: boolean }[];
}): string {
  const db = getDatabase();
  const noteId = data.id || `note_${crypto.randomBytes(6).toString('hex')}`;

  const insertNote = db.prepare(`
    INSERT INTO notes (id, telegram_chat_id, user_id, title, duration_sec, audio_path, waveform_peaks, raw_text, tldr, key_decisions, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  insertNote.run(
    noteId,
    data.telegramChatId || null,
    data.userId || null,
    data.title,
    data.durationSec,
    data.audioPath || null,
    JSON.stringify(data.waveformPeaks),
    data.rawText,
    JSON.stringify(data.tldr),
    JSON.stringify(data.keyDecisions)
  );

  const insertSegment = db.prepare(`
    INSERT INTO segments (id, note_id, start_sec, end_sec, speaker, text)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const seg of data.segments) {
    insertSegment.run(
      `seg_${crypto.randomBytes(6).toString('hex')}`,
      noteId,
      seg.start,
      seg.end,
      seg.speaker || 'Speaker',
      seg.text
    );
  }

  const insertAction = db.prepare(`
    INSERT INTO action_items (id, note_id, task, assignee, deadline, priority, completed, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  for (const item of data.actionItems) {
    insertAction.run(
      `act_${crypto.randomBytes(6).toString('hex')}`,
      noteId,
      item.task,
      item.assignee || null,
      item.deadline || null,
      item.priority || 'medium',
      item.completed ? 1 : 0
    );
  }

  return noteId;
}

export function getNoteById(id: string): NoteDetailsDTO | null {
  const db = getDatabase();
  const queryNote = db.prepare(`SELECT * FROM notes WHERE id = ?`);
  const note = queryNote.get(id) as NoteRecord | undefined;

  if (!note) {
    return null;
  }

  const querySegments = db.prepare(`SELECT * FROM segments WHERE note_id = ? ORDER BY start_sec ASC`);
  const segments = (querySegments.all(id) as unknown as SegmentRecord[]).map((s) => ({
    id: s.id,
    start: s.start_sec,
    end: s.end_sec,
    speaker: s.speaker || 'Speaker',
    text: s.text,
  }));

  const queryActions = db.prepare(`SELECT * FROM action_items WHERE note_id = ? ORDER BY created_at ASC`);
  const actionItems = (queryActions.all(id) as unknown as ActionItemRecord[]).map((a) => ({
    id: a.id,
    task: a.task,
    assignee: a.assignee || undefined,
    deadline: a.deadline || undefined,
    priority: (a.priority || 'medium') as 'high' | 'medium' | 'low',
    completed: Boolean(a.completed),
  }));

  let waveformPeaks: number[] = [];
  try {
    waveformPeaks = note.waveform_peaks ? JSON.parse(note.waveform_peaks) : [];
  } catch {
    waveformPeaks = [];
  }

  let tldr: string[] = [];
  try {
    tldr = note.tldr ? JSON.parse(note.tldr) : [];
  } catch {
    tldr = [];
  }

  let keyDecisions: string[] = [];
  try {
    keyDecisions = note.key_decisions ? JSON.parse(note.key_decisions) : [];
  } catch {
    keyDecisions = [];
  }

  return {
    id: note.id,
    telegramChatId: note.telegram_chat_id || undefined,
    title: note.title,
    durationSec: note.duration_sec,
    audioUrl: `/api/audio/${note.id}`,
    waveformPeaks,
    tldr,
    keyDecisions,
    actionItems,
    segments,
    rawText: note.raw_text || '',
    createdAt: note.created_at,
  };
}

export function listNotes(limit = 20): NoteListItemDTO[] {
  const db = getDatabase();
  const query = db.prepare(`
    SELECT 
      n.id, 
      n.title, 
      n.duration_sec, 
      n.tldr, 
      n.created_at,
      COUNT(a.id) as action_count,
      SUM(CASE WHEN a.completed = 1 THEN 1 ELSE 0 END) as completed_count
    FROM notes n
    LEFT JOIN action_items a ON a.note_id = n.id
    GROUP BY n.id
    ORDER BY n.created_at DESC
    LIMIT ?
  `);

  interface RawListItem {
    id: string;
    title: string;
    duration_sec: number;
    tldr: string | null;
    created_at: string;
    action_count: number;
    completed_count: number | null;
  }

  const rows = query.all(limit) as unknown as RawListItem[];
  return rows.map((r) => {
    let tldr: string[] = [];
    try {
      tldr = r.tldr ? JSON.parse(r.tldr) : [];
    } catch {
      tldr = [];
    }

    return {
      id: r.id,
      title: r.title,
      durationSec: r.duration_sec,
      tldr,
      actionItemsCount: Number(r.action_count || 0),
      completedCount: Number(r.completed_count || 0),
      createdAt: r.created_at,
    };
  });
}

export function toggleActionItem(id: string): { id: string; completed: boolean } | null {
  const db = getDatabase();
  const query = db.prepare(`SELECT id, completed FROM action_items WHERE id = ?`);
  const item = query.get(id) as { id: string; completed: number } | undefined;

  if (!item) {
    return null;
  }

  const newState = item.completed === 1 ? 0 : 1;
  const update = db.prepare(`UPDATE action_items SET completed = ? WHERE id = ?`);
  update.run(newState, id);

  return {
    id,
    completed: newState === 1,
  };
}

export function addActionItem(data: {
  noteId: string;
  task: string;
  assignee?: string;
  deadline?: string;
  priority?: string;
}): ActionItemDTO {
  const db = getDatabase();
  const id = `act_${crypto.randomBytes(6).toString('hex')}`;
  const insert = db.prepare(`
    INSERT INTO action_items (id, note_id, task, assignee, deadline, priority, completed, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'))
  `);

  insert.run(
    id,
    data.noteId,
    data.task,
    data.assignee || null,
    data.deadline || null,
    data.priority || 'medium'
  );

  return {
    id,
    task: data.task,
    assignee: data.assignee,
    deadline: data.deadline,
    priority: (data.priority || 'medium') as 'high' | 'medium' | 'low',
    completed: false,
  };
}

export function deleteActionItem(id: string): boolean {
  const db = getDatabase();
  const statement = db.prepare(`DELETE FROM action_items WHERE id = ?`);
  const result = statement.run(id);
  return (result.changes ?? 0) > 0;
}
