import type { FC } from 'react';
import { Clock, CheckCircle2, FileText, Lightbulb, ListTodo, Activity, Languages } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';

interface ExecutiveSummaryProps {
  title: string;
  durationSec: number;
  tldr: string[];
  keyDecisions: string[];
  actionItemsTotal: number;
  actionItemsCompleted: number;
  segmentsCount: number;
  tone?: string;
  sentiment?: string;
  currentLanguage?: 'en' | 'ro' | 'es';
  onLanguageChange?: (lang: 'en' | 'ro' | 'es') => void;
}

export const ExecutiveSummary: FC<ExecutiveSummaryProps> = ({
  title,
  durationSec,
  tldr,
  keyDecisions,
  actionItemsTotal,
  actionItemsCompleted,
  segmentsCount,
  tone = 'Action-oriented',
  sentiment = 'High Priority',
  currentLanguage = 'en',
  onLanguageChange,
}) => {
  const { hapticImpact } = useTelegram();
  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;
  const formattedDuration = `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  const completionPercent =
    actionItemsTotal > 0 ? Math.round((actionItemsCompleted / actionItemsTotal) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Top Header Card */}
      <div className="glass-panel p-5 rounded-2xl">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h2 className="text-xl font-bold font-display text-white tracking-tight flex-1">
            {title}
          </h2>

          {/* Language Switcher */}
          {onLanguageChange && (
            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl text-xs">
              <Languages className="w-3 h-3 text-slate-400 ml-1" />
              {(['en', 'ro', 'es'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    hapticImpact('light');
                    onLanguageChange(lang);
                  }}
                  className={`px-2 py-0.5 rounded-lg uppercase font-bold text-[10px] transition-all ${
                    currentLanguage === lang
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tone & Sentiment Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/25 px-2.5 py-0.5 rounded-md flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-indigo-400" />
            <span>Tone: {tone}</span>
          </span>

          <span className="text-[11px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 px-2.5 py-0.5 rounded-md">
            Sentiment: {sentiment}
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              Duration
            </div>
            <span className="text-base font-semibold text-slate-200">{formattedDuration}</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <ListTodo className="w-3.5 h-3.5 text-emerald-400" />
              Checklist
            </div>
            <span className="text-base font-semibold text-slate-200">
              {actionItemsCompleted}/{actionItemsTotal}
            </span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              Turns
            </div>
            <span className="text-base font-semibold text-slate-200">{segmentsCount} lines</span>
          </div>
        </div>

        {/* Action Progress Bar */}
        {actionItemsTotal > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800/60">
            <div className="flex justify-between text-xs text-slate-400 mb-1.5">
              <span>Action Items Resolved</span>
              <span className="font-semibold text-emerald-400">{completionPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                style={{ width: `${completionPercent}%` }}
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
              />
            </div>
          </div>
        )}
      </div>

      {/* TL;DR Bullets */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col gap-3">
        <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
          <Lightbulb className="w-4 h-4" />
          <span>Executive Summary (TL;DR)</span>
        </div>

        <ul className="flex flex-col gap-2.5">
          {tldr.map((bullet, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-slate-300 text-sm leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Key Decisions */}
      {keyDecisions.length > 0 && (
        <div className="glass-panel p-5 rounded-2xl flex flex-col gap-3 border-cyan-500/20">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>Key Decisions</span>
          </div>

          <ul className="flex flex-col gap-2.5">
            {keyDecisions.map((decision, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-slate-300 text-sm leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0" />
                <span>{decision}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
