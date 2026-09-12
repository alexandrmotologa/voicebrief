import type { FC } from 'react';
import { Clock, CheckCircle2, FileText, Lightbulb, ListTodo } from 'lucide-react';

interface ExecutiveSummaryProps {
  title: string;
  durationSec: number;
  tldr: string[];
  keyDecisions: string[];
  actionItemsTotal: number;
  actionItemsCompleted: number;
  segmentsCount: number;
}

export const ExecutiveSummary: FC<ExecutiveSummaryProps> = ({
  title,
  durationSec,
  tldr,
  keyDecisions,
  actionItemsTotal,
  actionItemsCompleted,
  segmentsCount,
}) => {
  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;
  const formattedDuration = `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  const completionPercent =
    actionItemsTotal > 0 ? Math.round((actionItemsCompleted / actionItemsTotal) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Top Header Card */}
      <div className="glass-panel p-5 rounded-2xl">
        <h2 className="text-xl font-bold font-display text-white tracking-tight mb-3">{title}</h2>

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
