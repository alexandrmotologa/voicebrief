import { describe, it, expect } from 'vitest';
import { getMockSyncAnalysis } from './mockAi.js';

describe('Mock AI Generator', () => {
  it('generates consistent, well-formed mock data', () => {
    const analysis = getMockSyncAnalysis();

    expect(analysis.id).toBe('demo');
    expect(analysis.title).toBe('Product Launch Sync & Action Items');
    expect(analysis.durationSec).toBe(165);
    expect(analysis.tldr.length).toBeGreaterThanOrEqual(3);
    expect(analysis.keyDecisions.length).toBeGreaterThanOrEqual(2);
    expect(analysis.actionItems.length).toBeGreaterThanOrEqual(3);
    expect(analysis.segments.length).toBeGreaterThanOrEqual(5);

    // Verify monotonic timestamps
    let lastTime = 0;
    for (const seg of analysis.segments) {
      expect(seg.start).toBeGreaterThanOrEqual(lastTime);
      expect(seg.end).toBeGreaterThan(seg.start);
      expect(seg.speaker).toBeDefined();
      expect(seg.text.length).toBeGreaterThan(5);
      lastTime = seg.start;
    }
  });
});
