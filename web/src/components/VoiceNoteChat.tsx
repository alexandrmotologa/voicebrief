import type { FC, FormEvent } from 'react';
import { useState } from 'react';
import { Send, Sparkles, Volume2, Loader2, Bot, User } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';

interface CitedSegment {
  time: number;
  speaker: string;
  text: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  citedSegments?: CitedSegment[];
}

interface VoiceNoteChatProps {
  noteId: string;
  onSeek: (seconds: number) => void;
}

export const VoiceNoteChat: FC<VoiceNoteChatProps> = ({ noteId, onSeek }) => {
  const { initData, hapticImpact, hapticNotification } = useTelegram();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Ask any question about this voice note. I will search the transcript and answer with exact timestamps.',
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const suggestedQuestions = [
    'Who is working on Stripe?',
    'What are all deadlines?',
    'When are DB migrations scheduled?',
    'Summarize key decisions',
  ];

  const handleSend = async (questionText: string) => {
    if (!questionText.trim() || isLoading) return;

    const query = questionText.trim();
    setInputQuery('');
    hapticImpact('light');

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: query,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/notes/${noteId}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-init-data': initData,
        },
        body: JSON.stringify({ question: query }),
      });

      if (!response.ok) {
        throw new Error('Failed to get answer');
      }

      const result = await response.json();
      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        sender: 'assistant',
        text: result.answer || 'I could not find an answer in the transcript.',
        citedSegments: result.citedSegments,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      hapticNotification('success');
    } catch (err) {
      console.error('Q&A error:', err);
      const errorMessage: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: 'assistant',
        text: 'Sorry, I had trouble answering that. Please try again.',
      };
      setMessages((prev) => [...prev, errorMessage]);
      hapticNotification('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSend(inputQuery);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header Info */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Ask Voice Note (Contextual AI)</span>
        </div>
      </div>

      {/* Suggested Prompt Chips */}
      <div className="flex flex-wrap gap-1.5">
        {suggestedQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            disabled={isLoading}
            className="text-[11px] font-medium bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 px-2.5 py-1 rounded-lg transition-colors text-left"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Messages List */}
      <div className="flex flex-col gap-3 min-h-[160px]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 text-xs ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.sender === 'assistant' && (
              <div className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
            )}

            <div
              className={`max-w-[85%] p-3 rounded-2xl flex flex-col gap-2 ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-sm'
                  : 'glass-panel text-slate-200 rounded-tl-sm'
              }`}
            >
              <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>

              {/* Timestamp citations */}
              {msg.citedSegments && msg.citedSegments.length > 0 && (
                <div className="pt-1 border-t border-slate-700/60 flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    Referenced moments:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {msg.citedSegments.map((cit, cIdx) => (
                      <button
                        key={cIdx}
                        onClick={() => {
                          hapticImpact('light');
                          onSeek(cit.time);
                        }}
                        className="flex items-center gap-1 bg-slate-900/90 hover:bg-slate-800 text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-500/30 text-[10px] transition-colors"
                        title={cit.text}
                      >
                        <Volume2 className="w-2.5 h-2.5" />
                        <span>{formatTime(cit.time)}</span>
                        <span className="text-slate-400 text-[9px] truncate max-w-[80px]">
                          ({cit.speaker.split(' ')[0]})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 border border-slate-700 mt-0.5">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2.5 text-xs justify-start items-center">
            <div className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="glass-panel px-3 py-2 rounded-xl text-slate-400 text-xs flex items-center gap-1.5">
              <span>Searching transcript context...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="flex gap-2 sticky bottom-2 pt-1">
        <input
          type="text"
          placeholder="Ask a question about this audio..."
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          disabled={isLoading}
          className="flex-1 bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors shadow-lg"
        />
        <button
          type="submit"
          disabled={!inputQuery.trim() || isLoading}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-600/25 transition-all active:scale-95 flex items-center justify-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
