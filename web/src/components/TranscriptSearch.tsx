import type { FC } from 'react';
import { Search, X } from 'lucide-react';

interface TranscriptSearchProps {
  value: string;
  onChange: (query: string) => void;
  matchCount?: number;
}

export const TranscriptSearch: FC<TranscriptSearchProps> = ({
  value,
  onChange,
  matchCount,
}) => {
  return (
    <div className="relative flex items-center">
      <Search className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
      <input
        type="text"
        placeholder="Search keywords in transcript..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-9 pr-16 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
      />

      <div className="absolute right-2.5 flex items-center gap-1.5">
        {value && matchCount !== undefined && (
          <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
            {matchCount} {matchCount === 1 ? 'match' : 'matches'}
          </span>
        )}

        {value && (
          <button
            onClick={() => onChange('')}
            className="text-slate-500 hover:text-slate-300 p-0.5 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
