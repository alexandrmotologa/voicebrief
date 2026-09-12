import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import { sliceAudioSnippet, getAudioDuration } from './converter.js';

describe('Audio Slicing Engine', () => {
  const demoAudioPath = path.join(process.cwd(), 'assets', 'demo.mp3');
  const tempSlicePath = path.join(process.cwd(), 'data', 'audio', 'clips', 'test_slice.mp3');

  it('slices an audio file into a 10-second snippet', async () => {
    if (!fs.existsSync(demoAudioPath)) {
      // If assets/demo.mp3 not in current cwd, check server/assets/demo.mp3
      const altDemo = path.join(process.cwd(), 'server', 'assets', 'demo.mp3');
      if (!fs.existsSync(altDemo)) {
        return;
      }
    }

    const inputPath = fs.existsSync(demoAudioPath)
      ? demoAudioPath
      : path.join(process.cwd(), 'server', 'assets', 'demo.mp3');

    await sliceAudioSnippet(inputPath, 10, 20, tempSlicePath);

    expect(fs.existsSync(tempSlicePath)).toBe(true);

    const duration = await getAudioDuration(tempSlicePath);
    expect(duration).toBeGreaterThanOrEqual(9);
    expect(duration).toBeLessThanOrEqual(12);

    // Cleanup
    try {
      fs.unlinkSync(tempSlicePath);
    } catch {
      // ignore
    }
  });
});
