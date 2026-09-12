import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { User, Volume2, ArrowDownToLine } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';

export interface TranscriptSegment {
  id: string;
  start: number;
  end: number;
  speaker: string;
  text: string;
}

interface TimestampedTranscriptProps {
  segments: TranscriptSegment[];
  activeSegmentIndex: number;
  onSeek: (seconds: number) => void;
  searchQuery?: string;
}

export const TimestampedTranscript: FC<TimestampedTranscriptProps> = ({
  segments,
  activeSegmentIndex,
  onSeek,
  searchQuery = '',
}) => {
  const { hapticImpact } = useTelegram();
  const activeItemRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (autoScroll && activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeSegmentIndex, autoScroll]);

  const handleSeek = (seconds: number) => {
    hapticImpact('light');
    onSeek(seconds);
  };

  const getSpeakerColor = (speaker: string) => {
    const name = speaker.toLowerCase();
    if (name.includes('alex')) return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
    if (name.includes('elena')) return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
    if (name.includes('david')) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    return 'text-slate-300 bg-slate-800/80 border-slate-700/60';
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-amber-400/30 text-amber-200 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Auto-scroll toggle */}
      <div className="flex justify-between items-center px-1 text-xs text-slate-400">
        <span>Click any line to jump audio</span>
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
            autoScroll
              ? 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/20'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <ArrowDownToLine className="w-3.5 h-3.5" />
          <span>Follow Audio</span>
        </button>
      </div>

      {/* Segments list */}
      <div className="flex flex-col gap-2.5">
        {segments.map((seg, idx) => {
          const isActive = idx === activeSegmentIndex;
          return (
            <div
              key={seg.id}
              ref={isActive ? activeItemRef : null}
              onClick={() => handleSeek(seg.start)}
              className={`glass-panel p-3.5 rounded-xl cursor-pointer transition-all duration-200 select-none ${
                isActive
                  ? 'border-indigo-500/70 bg-indigo-950/30 shadow-[0_0_16px_rgba(99,102,241,0.2)]'
                  : 'hover:border-slate-700 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                {/* Speaker Tag */}
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-md border flex items-center gap-1.5 ${getSpeakerColor(
                    seg.speaker
                  )}`}
                >
                  <User className="w-3 h-3" />
                  {seg.speaker}
                </span>

                {/* Timestamp button */}
                <div className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-slate-400">
                  {isActive && <Volume2 className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />}
                  <span className={isActive ? 'text-indigo-300 font-semibold' : ''}>
                    {formatTimestamp(seg.start)}
                  </span>
                </div>
              </div>

              {/* Spoken Text */}
              <p
                className={`text-sm leading-relaxed transition-colors ${
                  isActive ? 'text-slate-100 font-medium' : 'text-slate-300'
                }`}
              >
                {highlightMatch(seg.text, searchQuery)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
