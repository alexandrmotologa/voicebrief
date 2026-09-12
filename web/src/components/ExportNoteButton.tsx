import type { FC } from 'react';
import { useState } from 'react';
import { Share2, Copy, Download, Check, FileText } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import { ActionItem } from './ActionItemsList';
import { TranscriptSegment } from './TimestampedTranscript';

interface ExportNoteButtonProps {
  title: string;
  durationSec: number;
  tldr: string[];
  keyDecisions: string[];
  actionItems: ActionItem[];
  segments: TranscriptSegment[];
}

export const ExportNoteButton: FC<ExportNoteButtonProps> = ({
  title,
  durationSec,
  tldr,
  keyDecisions,
  actionItems,
  segments,
}) => {
  const { hapticNotification } = useTelegram();
  const [isOpen, setIsOpen] = useState(false);
  const [copiedState, setCopiedState] = useState<'md' | 'tldr' | null>(null);

  const formatMarkdown = () => {
    const mins = Math.floor(durationSec / 60);
    const secs = durationSec % 60;

    let md = `# ${title}\n\n`;
    md += `*Duration: ${mins}m ${secs}s*\n\n`;

    md += `## TL;DR\n`;
    for (const bullet of tldr) {
      md += `- ${bullet}\n`;
    }

    if (actionItems.length > 0) {
      md += `\n## Action Items\n`;
      for (const item of actionItems) {
        const box = item.completed ? '[x]' : '[ ]';
        const assignee = item.assignee ? ` (@${item.assignee})` : '';
        const deadline = item.deadline ? ` - Due: ${item.deadline}` : '';
        md += `- ${box} ${item.task}${assignee}${deadline}\n`;
      }
    }

    if (keyDecisions.length > 0) {
      md += `\n## Key Decisions\n`;
      for (const dec of keyDecisions) {
        md += `- ${dec}\n`;
      }
    }

    if (segments.length > 0) {
      md += `\n## Transcript\n`;
      for (const seg of segments) {
        const sMins = Math.floor(seg.start / 60);
        const sSecs = Math.floor(seg.start % 60);
        const time = `${sMins.toString().padStart(2, '0')}:${sSecs.toString().padStart(2, '0')}`;
        md += `**[${time}] ${seg.speaker}:** ${seg.text}\n\n`;
      }
    }

    return md;
  };

  const copyToClipboard = async (text: string, type: 'md' | 'tldr') => {
    try {
      await navigator.clipboard.writeText(text);
      hapticNotification('success');
      setCopiedState(type);
      setTimeout(() => setCopiedState(null), 2000);
    } catch {
      // Fallback
    }
  };

  const downloadJson = () => {
    const payload = {
      title,
      durationSec,
      tldr,
      keyDecisions,
      actionItems,
      segments,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voicebrief-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    hapticNotification('success');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors"
      >
        <Share2 className="w-3.5 h-3.5 text-indigo-400" />
        <span>Export</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-10 w-48 glass-dock p-1.5 rounded-xl shadow-2xl border border-slate-700 z-50 flex flex-col gap-1 text-xs">
          <button
            onClick={() => {
              copyToClipboard(formatMarkdown(), 'md');
              setIsOpen(false);
            }}
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-slate-200 hover:bg-indigo-600 hover:text-white transition-colors text-left"
          >
            {copiedState === 'md' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>Copy Markdown</span>
          </button>

          <button
            onClick={() => {
              copyToClipboard(tldr.map((b) => `* ${b}`).join('\n'), 'tldr');
              setIsOpen(false);
            }}
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-slate-200 hover:bg-indigo-600 hover:text-white transition-colors text-left"
          >
            {copiedState === 'tldr' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
            <span>Copy TL;DR only</span>
          </button>

          <button
            onClick={() => {
              downloadJson();
              setIsOpen(false);
            }}
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-slate-200 hover:bg-indigo-600 hover:text-white transition-colors text-left"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download JSON</span>
          </button>
        </div>
      )}
    </div>
  );
};
