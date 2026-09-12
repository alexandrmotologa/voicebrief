import type { FC, MouseEvent } from 'react';
import { useRef } from 'react';
import { Play, Pause, RotateCcw, RotateCw } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';

export interface WaveformSegment {
  start: number;
  end: number;
  speaker: string;
}

interface WaveformPlayerProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  peaks: number[];
  playbackRate: 1 | 1.25 | 1.5 | 2;
  segments?: WaveformSegment[];
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onRateChange: (rate: 1 | 1.25 | 1.5 | 2) => void;
}

export const WaveformPlayer: FC<WaveformPlayerProps> = ({
  isPlaying,
  currentTime,
  duration,
  peaks,
  playbackRate,
  segments = [],
  onTogglePlay,
  onSeek,
  onRateChange,
}) => {
  const { hapticImpact } = useTelegram();
  const waveformRef = useRef<HTMLDivElement>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleWaveformClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!waveformRef.current || duration <= 0) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    hapticImpact('light');
    onSeek(ratio * duration);
  };

  const handleSkip = (deltaSeconds: number) => {
    hapticImpact('light');
    onSeek(currentTime + deltaSeconds);
  };

  const progressRatio = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const displayPeaks = peaks && peaks.length > 0 ? peaks : Array(64).fill(0.35);

  const getBarColor = (barTime: number, isPlayed: boolean) => {
    const seg = segments.find((s) => barTime >= s.start && barTime <= s.end);
    const speakerName = (seg?.speaker || '').toLowerCase();

    if (speakerName.includes('alex')) {
      return isPlayed
        ? 'bg-indigo-400 shadow-sm shadow-indigo-500/50'
        : 'bg-indigo-950/80 border border-indigo-800/40';
    }
    if (speakerName.includes('elena')) {
      return isPlayed
        ? 'bg-cyan-400 shadow-sm shadow-cyan-500/50'
        : 'bg-cyan-950/80 border border-cyan-800/40';
    }
    if (speakerName.includes('david')) {
      return isPlayed
        ? 'bg-emerald-400 shadow-sm shadow-emerald-500/50'
        : 'bg-emerald-950/80 border border-emerald-800/40';
    }

    return isPlayed ? 'bg-indigo-400' : 'bg-slate-700/80';
  };

  return (
    <div className="w-full glass-dock p-4 rounded-2xl shadow-2xl flex flex-col gap-2.5">
      {/* Speaker Heatmap Legend */}
      <div className="flex items-center justify-between px-1 text-[10px] text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-indigo-400" /> Alex
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400" /> Elena
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> David
          </span>
        </div>
        <span className="text-slate-500">Speaker Heatmap</span>
      </div>

      {/* Waveform visual scrubber */}
      <div
        ref={waveformRef}
        onClick={handleWaveformClick}
        className="relative h-12 w-full flex items-center justify-between gap-[2px] cursor-pointer group px-1 select-none"
        title="Click to seek"
      >
        {displayPeaks.map((peak, idx) => {
          const barRatio = idx / displayPeaks.length;
          const isPlayed = barRatio <= progressRatio;
          const barTime = barRatio * duration;
          const heightPercent = Math.max(12, Math.min(100, Math.round(peak * 100)));
          const barColor = getBarColor(barTime, isPlayed);

          return (
            <div
              key={idx}
              className="flex-1 flex items-center justify-center h-full transition-all duration-75"
            >
              <div
                style={{ height: `${heightPercent}%` }}
                className={`w-full max-w-[4px] rounded-full transition-colors duration-150 ${barColor}`}
              />
            </div>
          );
        })}

        {/* Floating progress scrubber head */}
        <div
          style={{ left: `${progressRatio * 100}%` }}
          className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)] pointer-events-none transition-all duration-75"
        />
      </div>

      {/* Control bar */}
      <div className="flex items-center justify-between pt-0.5">
        {/* Play/Pause & Skips */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSkip(-10)}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-full transition-colors active:scale-95"
            title="Rewind 10s"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              hapticImpact('medium');
              onTogglePlay();
            }}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-indigo-400 active:scale-95 transition-all"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={() => handleSkip(10)}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-full transition-colors active:scale-95"
            title="Forward 10s"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Time Counter */}
          <div className="text-xs font-mono font-medium text-slate-300 tracking-wider ml-1">
            <span className="text-white">{formatTime(currentTime)}</span>
            <span className="text-slate-500 mx-1">/</span>
            <span className="text-slate-400">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Speed selectors */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-full border border-slate-800">
          {([1, 1.25, 1.5, 2] as const).map((rate) => (
            <button
              key={rate}
              onClick={() => {
                hapticImpact('light');
                onRateChange(rate);
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-all ${
                playbackRate === rate
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
