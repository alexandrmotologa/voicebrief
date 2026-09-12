export interface MockSegment {
  start: number;
  end: number;
  speaker: string;
  text: string;
}

export interface MockAnalysisResult {
  id: string;
  title: string;
  durationSec: number;
  tldr: string[];
  keyDecisions: string[];
  actionItems: {
    task: string;
    assignee?: string;
    deadline?: string;
    priority: 'high' | 'medium' | 'low';
    completed: boolean;
  }[];
  segments: MockSegment[];
  rawText: string;
  tone?: string;
  sentiment?: string;
}

export function getMockSyncAnalysis(): MockAnalysisResult {
  const segments: MockSegment[] = [
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
      text: 'Thanks Alex. On the product side, the major question is the Stripe checkout integration. Are all webhook edge cases covered for multi-currency payments?',
    },
    {
      start: 29.0,
      end: 48.2,
      speaker: 'David (Backend)',
      text: "Yes, I finished writing the idempotent webhook handlers yesterday. All automated regression suites passed, and we verified test webhooks against the Stripe CLI without dropped events.",
    },
    {
      start: 48.8,
      end: 67.0,
      speaker: 'Alex (Engineering)',
      text: 'Great work David. Given that we still need to run an end-to-end smoke test on the iOS staging build, I suggest we move the release date from Friday to next Tuesday.',
    },
    {
      start: 67.5,
      end: 84.1,
      speaker: 'Elena (Product)',
      text: 'Moving to Tuesday makes complete sense. That gives our QA team a clean 48-hour window. Elena will handle checkout validation on Tuesday morning.',
    },
    {
      start: 84.6,
      end: 104.3,
      speaker: 'David (Backend)',
      text: 'Regarding the database migrations for API v2, we agreed to execute the table alterations on Sunday at 02:00 UTC during our lowest traffic window.',
    },
    {
      start: 104.8,
      end: 123.7,
      speaker: 'Alex (Engineering)',
      text: "Agreed. I will post the maintenance notice to the status page and prepare the GitHub release notes by Monday morning.",
    },
    {
      start: 124.2,
      end: 142.9,
      speaker: 'Elena (Product)',
      text: 'One last item: the design team updated the token palette. Let us make sure David and Alex sign off on the design tokens before Wednesday freeze.',
    },
    {
      start: 143.5,
      end: 165.0,
      speaker: 'Alex (Engineering)',
      text: "Sounds like a solid plan. Everyone has their action items logged, and we'll reconvene at Monday standup. Let's make this launch seamless.",
    },
  ];

  const rawText = segments.map((s) => `${s.speaker}: ${s.text}`).join('\n\n');

  return {
    id: 'demo',
    title: 'Product Launch Sync & Action Items',
    durationSec: 165,
    tldr: [
      'Mobile v1.4 release shifted to next Tuesday to allow staging verification.',
      'Stripe webhook integration and automated idempotency handlers passed tests.',
      'Database migrations scheduled for Sunday at 02:00 UTC low-traffic window.',
      'Design tokens require sign-off before Wednesday code freeze.',
    ],
    keyDecisions: [
      'Release date confirmed for next Tuesday with 48h QA buffer.',
      'Execute database migrations on Sunday at 02:00 UTC.',
      'Postpone dark mode v2 to subsequent maintenance cycle.',
    ],
    actionItems: [
      {
        task: 'Update release notes and changelog on GitHub',
        assignee: 'Alex',
        deadline: 'Monday 10:00 AM',
        priority: 'high',
        completed: false,
      },
      {
        task: 'Run end-to-end checkout tests on iOS staging',
        assignee: 'Elena',
        deadline: 'Tuesday 02:00 PM',
        priority: 'high',
        completed: true,
      },
      {
        task: 'Review and merge Stripe webhook idempotency PR',
        assignee: 'David',
        deadline: 'Monday 05:00 PM',
        priority: 'medium',
        completed: false,
      },
      {
        task: 'Finalize customer support escalation runbook in Notion',
        assignee: 'Elena',
        deadline: 'Wednesday 12:00 PM',
        priority: 'low',
        completed: false,
      },
    ],
    segments,
    rawText,
    tone: 'Action-oriented',
    sentiment: 'High Priority',
  };
}
