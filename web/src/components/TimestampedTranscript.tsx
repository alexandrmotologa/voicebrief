import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { User, Volume2, ArrowDownToLine, Scissors, Download, Check, Loader2, Play } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';

export interface TranscriptSegment {
  id: string;
  start: number;
  end: number;
  speaker: string;
  text: string;
}

interface TimestampedTranscriptProps {
  noteId?: string;
  segments: TranscriptSegment[];
  activeSegmentIndex: number;
  onSeek: (seconds: number) => void;
  searchQuery?: string;
}

export const TimestampedTranscript: FC<TimestampedTranscriptProps> = ({
  noteId = 'demo',
  segments,
  activeSegmentIndex,
  onSeek,
  searchQuery = '',
}) => {
  const { initData, hapticImpact, hapticNotification } = useTelegram();
  const activeItemRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [clippingId, setClippingId] = useState<string | null>(null);
  const [activeClip, setActiveClip] = useState<{ id: string; url: string; durationSec: number } | null>(
    null
  );
  const [clipAudio, setClipAudio] = useState<HTMLAudioElement | null>(null);
  const [isClipPlaying, setIsClipPlaying] = useState(false);

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

  const handleCreateClip = async (seg: TranscriptSegment, e: React.MouseEvent) => {
    e.stopPropagation();
    setClippingId(seg.id);
    hapticImpact('medium');

    try {
      const response = await fetch(`/api/notes/${noteId}/clip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-init-data': initData,
        },
        body: JSON.stringify({
          start: seg.start,
          end: seg.end,
          label: `${seg.speaker}: ${seg.text.slice(0, 20)}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate snippet clip');
      }

      const clipData = await response.json();
      setActiveClip({ id: seg.id, url: clipData.clipUrl, durationSec: clipData.durationSec });
      hapticNotification('success');
    } catch (err) {
      console.error('Clip generation error:', err);
      hapticNotification('error');
    } finally {
      setClippingId(null);
    }
  };

  const playSnippet = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (clipAudio) {
      clipAudio.pause();
    }

    const audio = new Audio(url);
    setClipAudio(audio);
    setIsClipPlaying(true);
    hapticImpact('light');

    audio.play().catch((err) => console.warn('Snippet play failed:', err));
    audio.onended = () => setIsClipPlaying(false);
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
          const isThisClipping = clippingId === seg.id;
          const hasClip = activeClip?.id === seg.id;

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

                <div className="flex items-center gap-2">
                  {/* Clip Snippet Button */}
                  <button
                    onClick={(e) => handleCreateClip(seg, e)}
                    disabled={isThisClipping}
                    className="text-[10px] text-slate-400 hover:text-indigo-300 bg-slate-800/80 hover:bg-slate-800 px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1 transition-colors"
                    title="Slice audio snippet"
                  >
                    {isThisClipping ? (
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    ) : (
                      <Scissors className="w-2.5 h-2.5" />
                    )}
                    <span>Clip</span>
                  </button>

                  {/* Timestamp button */}
                  <div className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-slate-400">
                    {isActive && <Volume2 className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />}
                    <span className={isActive ? 'text-indigo-300 font-semibold' : ''}>
                      {formatTimestamp(seg.start)}
                    </span>
                  </div>
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

              {/* Active Audio Clip Download Banner */}
              {hasClip && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between gap-2 text-xs"
                >
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Clip ready ({activeClip.durationSec}s)</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => playSnippet(activeClip.url, e)}
                      className="bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded flex items-center gap-1 text-[11px] transition-colors"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>{isClipPlaying ? 'Playing' : 'Listen'}</span>
                    </button>

                    <a
                      href={activeClip.url}
                      download={`clip_${Math.round(seg.start)}s.mp3`}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2 py-0.5 rounded flex items-center gap-1 text-[11px] transition-colors"
                    >
                      <Download className="w-2.5 h-2.5 text-cyan-400" />
                      <span>MP3</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
