import { describe, it, expect } from 'vitest';
import { answerQuestionAboutNote } from './qa.js';

describe('Voice Note QA Engine', () => {
  const sampleRawText = `Alex (Engineering): Good morning team. Let's do a quick alignment on the v1.4 mobile release and wrap up outstanding blockers before code freeze.
Elena (Product): Thanks Alex. On the product side, the major question is the Stripe checkout integration.
David (Backend): Yes, I finished writing the idempotent webhook handlers yesterday. All automated regression suites passed.`;

  const sampleSegments = [
    {
      start: 0.0,
      end: 12.4,
      speaker: 'Alex (Engineering)',
      text: "Good morning team. Let's do a quick alignment on the v1.4 mobile release and wrap up outstanding blockers before code freeze.",
    },
    {
      start: 12.8,
      end: 28.5,
      speaker: 'Elena (Product)',
      text: 'Thanks Alex. On the product side, the major question is the Stripe checkout integration.',
    },
    {
      start: 29.0,
      end: 48.2,
      speaker: 'David (Backend)',
      text: 'Yes, I finished writing the idempotent webhook handlers yesterday. All automated regression suites passed.',
    },
  ];

  it('answers questions about Stripe checkout accurately', async () => {
    const result = await answerQuestionAboutNote('What is the status of Stripe payments?', sampleRawText, sampleSegments);

    expect(result.answer).toBeDefined();
    expect(result.answer.toLowerCase()).toContain('stripe');
    expect(result.citedSegments.length).toBeGreaterThanOrEqual(1);
    expect(result.citedSegments[0].time).toBeGreaterThanOrEqual(0);
  });

  it('answers questions about database migrations accurately', async () => {
    const result = await answerQuestionAboutNote('When are the database migrations scheduled?', sampleRawText, sampleSegments);

    expect(result.answer).toBeDefined();
    expect(result.answer.toLowerCase()).toContain('sunday');
    expect(result.citedSegments.length).toBeGreaterThanOrEqual(1);
  });

  it('answers questions about release deadlines', async () => {
    const result = await answerQuestionAboutNote('What is the deadline for the release?', sampleRawText, sampleSegments);

    expect(result.answer).toBeDefined();
    expect(result.answer.toLowerCase()).toContain('tuesday');
    expect(result.citedSegments.length).toBeGreaterThanOrEqual(1);
  });
});
