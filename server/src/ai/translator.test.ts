import { describe, it, expect } from 'vitest';
import { translateNoteContent, TranslatablePayload } from './translator.js';

describe('Translation Engine', () => {
  const sampleNote: TranslatablePayload = {
    title: 'Product Launch Sync & Action Items',
    tldr: ['Mobile release shifted to next Tuesday.', 'Stripe webhook integration passed tests.'],
    keyDecisions: ['Release date confirmed for next Tuesday.'],
    actionItems: [
      {
        id: '1',
        task: 'Update release notes on GitHub',
        priority: 'high',
        completed: false,
      },
    ],
    segments: [
      {
        id: 'seg_1',
        start: 0,
        end: 5,
        speaker: 'Alex',
        text: 'Good morning team.',
      },
    ],
  };

  it('preserves content when language is en', async () => {
    const translated = await translateNoteContent(sampleNote, 'en');
    expect(translated.title).toBe(sampleNote.title);
    expect(translated.tldr).toEqual(sampleNote.tldr);
  });

  it('translates title and tasks to Romanian accurately', async () => {
    const translated = await translateNoteContent(sampleNote, 'ro');
    expect(translated.title).toContain('Sincronizare');
    expect(translated.actionItems[0].task).toContain('GitHub');
    expect(translated.segments[0].text).toContain('Bună dimineața');
  });

  it('translates title and tasks to Spanish accurately', async () => {
    const translated = await translateNoteContent(sampleNote, 'es');
    expect(translated.title).toContain('Sincronización');
    expect(translated.actionItems[0].task).toContain('GitHub');
  });
});
