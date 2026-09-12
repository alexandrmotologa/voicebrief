import { getMockSyncAnalysis } from './mockAi.js';

export interface ExtractedActionItem {
  task: string;
  assignee?: string;
  deadline?: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
}

export interface SummaryExtractionResult {
  title: string;
  tldr: string[];
  keyDecisions: string[];
  actionItems: ExtractedActionItem[];
  tone?: string;
  sentiment?: string;
}

export async function summarizeTranscript(
  rawText: string,
  provider = process.env.AI_SUMMARIZER || 'openai'
): Promise<SummaryExtractionResult> {
  const isDemo = process.env.DEMO_MODE === 'true';

  if (isDemo || provider === 'mock' || !rawText.trim()) {
    const mock = getMockSyncAnalysis();
    return {
      title: mock.title,
      tldr: mock.tldr,
      keyDecisions: mock.keyDecisions,
      actionItems: mock.actionItems,
      tone: mock.tone || 'Action-oriented',
      sentiment: mock.sentiment || 'High Priority',
    };
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (provider === 'openai' && openaiKey) {
    try {
      return await callChatCompletion({
        apiUrl: 'https://api.openai.com/v1/chat/completions',
        apiKey: openaiKey,
        model: 'gpt-4o-mini',
        rawText,
      });
    } catch (err) {
      console.warn('OpenAI summarization failed, falling back to mock:', err);
    }
  }

  if (groqKey) {
    try {
      return await callChatCompletion({
        apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
        apiKey: groqKey,
        model: 'llama-3.3-70b-versatile',
        rawText,
      });
    } catch (err) {
      console.warn('Groq summarization failed, falling back to mock:', err);
    }
  }

  const mock = getMockSyncAnalysis();
  return {
    title: mock.title,
    tldr: mock.tldr,
    keyDecisions: mock.keyDecisions,
    actionItems: mock.actionItems,
  };
}

interface ChatCompletionParams {
  apiUrl: string;
  apiKey: string;
  model: string;
  rawText: string;
}

async function callChatCompletion({
  apiUrl,
  apiKey,
  model,
  rawText,
}: ChatCompletionParams): Promise<SummaryExtractionResult> {
  const systemPrompt = `You are an audio intelligence assistant for VoiceBrief.
Analyze the following transcript of a voice message or meeting sync.
Output valid JSON adhering strictly to this schema:
{
  "title": "Concise 3-6 word descriptive title of the audio note",
  "tone": "Brief tone descriptor e.g. Action-oriented, Urgent, Strategic, Brainstorming",
  "sentiment": "Overall sentiment e.g. High Priority, Constructive, Informative",
  "tldr": ["3-4 clear, concrete executive bullet points summarizing main facts"],
  "keyDecisions": ["Concrete decisions agreed upon by participants"],
  "actionItems": [
    {
      "task": "Active imperative task description (e.g. Deploy API migrations)",
      "assignee": "Person name or empty string if unassigned",
      "deadline": "Mentioned deadline or empty string",
      "priority": "high" | "medium" | "low",
      "completed": false
    }
  ]
}
Return only JSON. Do not wrap in markdown quotes.`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: rawText },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error (${response.status}): ${errorText}`);
  }

  interface ChatResponsePayload {
    choices: Array<{
      message: {
        content: string;
      };
    }>;
  }

  const data = (await response.json()) as ChatResponsePayload;
  const content = data.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from LLM');
  }

  const parsed = JSON.parse(content);
  return {
    title: parsed.title || 'Voice Note Summary',
    tone: parsed.tone || 'Action-oriented',
    sentiment: parsed.sentiment || 'Constructive',
    tldr: Array.isArray(parsed.tldr) ? parsed.tldr : ['Audio transcribed.'],
    keyDecisions: Array.isArray(parsed.keyDecisions) ? parsed.keyDecisions : [],
    actionItems: Array.isArray(parsed.actionItems)
      ? parsed.actionItems.map((item: { task?: string; assignee?: string; deadline?: string; priority?: string; completed?: boolean }) => ({
          task: item.task || 'Unspecified task',
          assignee: item.assignee || undefined,
          deadline: item.deadline || undefined,
          priority: (item.priority === 'high' || item.priority === 'low' ? item.priority : 'medium'),
          completed: Boolean(item.completed),
        }))
      : [],
  };
}
