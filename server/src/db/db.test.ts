import { describe, it, expect, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import { getDatabase, resetDatabaseInstance } from './database.js';
import {
  saveNote,
  getNoteById,
  toggleActionItem,
  addActionItem,
  deleteActionItem,
  listNotes,
} from './queries.js';

const TEST_DB_PATH = path.join(process.cwd(), 'data', 'test_voicebrief.db');

describe('Database & Queries', () => {
  beforeEach(() => {
    resetDatabaseInstance();
    if (fs.existsSync(TEST_DB_PATH)) {
      try {
        fs.unlinkSync(TEST_DB_PATH);
      } catch {
        // ignore
      }
    }
    getDatabase(TEST_DB_PATH);
  });

  it('saves and retrieves a complete voice note', () => {
    const noteId = saveNote({
      title: 'Weekly Standup Test',
      durationSec: 120,
      rawText: 'Alice: We need to deploy the migration.',
      tldr: ['Deploy migration by Friday.'],
      keyDecisions: ['Migration scheduled for Friday.'],
      waveformPeaks: [0.1, 0.5, 0.9],
      segments: [
        {
          start: 0.0,
          end: 5.0,
          speaker: 'Alice',
          text: 'We need to deploy the migration.',
        },
      ],
      actionItems: [
        {
          task: 'Run migration script',
          assignee: 'Bob',
          deadline: 'Friday',
          priority: 'high',
          completed: false,
        },
      ],
    });

    expect(noteId).toBeDefined();

    const note = getNoteById(noteId);
    expect(note).not.toBeNull();
    expect(note?.title).toBe('Weekly Standup Test');
    expect(note?.durationSec).toBe(120);
    expect(note?.tldr).toEqual(['Deploy migration by Friday.']);
    expect(note?.segments.length).toBe(1);
    expect(note?.segments[0].speaker).toBe('Alice');
    expect(note?.actionItems.length).toBe(1);
    expect(note?.actionItems[0].task).toBe('Run migration script');
    expect(note?.actionItems[0].completed).toBe(false);
  });

  it('toggles an action item completion state', () => {
    const noteId = saveNote({
      title: 'Toggle Test Note',
      durationSec: 60,
      rawText: 'Test',
      tldr: ['Test'],
      keyDecisions: [],
      waveformPeaks: [0.2],
      segments: [],
      actionItems: [
        {
          task: 'Test toggle item',
          completed: false,
        },
      ],
    });

    const note = getNoteById(noteId);
    expect(note).not.toBeNull();
    const actionItem = note!.actionItems[0];
    expect(actionItem.completed).toBe(false);

    const toggled = toggleActionItem(actionItem.id);
    expect(toggled?.completed).toBe(true);

    const reloaded = getNoteById(noteId);
    expect(reloaded!.actionItems[0].completed).toBe(true);
  });

  it('adds and deletes a custom action item', () => {
    const noteId = saveNote({
      title: 'Action Item Modification Test',
      durationSec: 45,
      rawText: '',
      tldr: [],
      keyDecisions: [],
      waveformPeaks: [],
      segments: [],
      actionItems: [],
    });

    const added = addActionItem({
      noteId,
      task: 'Verify staging logs',
      assignee: 'Charlie',
      priority: 'high',
    });

    expect(added.task).toBe('Verify staging logs');
    expect(added.assignee).toBe('Charlie');
    expect(added.priority).toBe('high');

    const noteAfterAdd = getNoteById(noteId);
    expect(noteAfterAdd?.actionItems.length).toBe(1);

    const deleted = deleteActionItem(added.id);
    expect(deleted).toBe(true);

    const noteAfterDelete = getNoteById(noteId);
    expect(noteAfterDelete?.actionItems.length).toBe(0);
  });

  it('lists notes with correct counts', () => {
    saveNote({
      title: 'Note 1',
      durationSec: 30,
      rawText: '',
      tldr: ['First summary'],
      keyDecisions: [],
      waveformPeaks: [],
      segments: [],
      actionItems: [
        { task: 'Item 1', completed: true },
        { task: 'Item 2', completed: false },
      ],
    });

    const list = listNotes(10);
    expect(list.length).toBeGreaterThanOrEqual(1);
    const item = list.find((n) => n.title === 'Note 1');
    expect(item).toBeDefined();
    expect(item?.actionItemsCount).toBe(2);
    expect(item?.completedCount).toBe(1);
  });
});
