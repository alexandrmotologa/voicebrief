import { useState, useEffect } from 'react';
import { Mic, ListChecks, FileText, Upload, RefreshCw, Sparkles } from 'lucide-react';
import { useTelegram } from './hooks/useTelegram';
import { useAudioSync } from './hooks/useAudioSync';
import { WaveformPlayer } from './components/WaveformPlayer';
import { ExecutiveSummary } from './components/ExecutiveSummary';
import { ActionItemsList, ActionItem } from './components/ActionItemsList';
import { TimestampedTranscript, TranscriptSegment } from './components/TimestampedTranscript';
import { TranscriptSearch } from './components/TranscriptSearch';
import { ExportNoteButton } from './components/ExportNoteButton';
import { DirectAudioUpload } from './components/DirectAudioUpload';

interface NoteData {
  id: string;
  title: string;
  durationSec: number;
  audioUrl: string;
  waveformPeaks: number[];
  tldr: string[];
  keyDecisions: string[];
  actionItems: ActionItem[];
  segments: TranscriptSegment[];
  rawText: string;
  createdAt: string;
}

export function App() {
  const { user, initData, hapticImpact } = useTelegram();
  const [activeTab, setActiveTab] = useState<'summary' | 'actions' | 'transcript' | 'upload'>('summary');
  const [note, setNote] = useState<NoteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Extract noteId from URL params or default to 'demo'
  const urlParams = new URLSearchParams(window.location.search);
  const noteId = urlParams.get('noteId') || 'demo';

  const fetchNote = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/notes/${id}`, {
        headers: {
          'x-telegram-init-data': initData,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load note');
      }

      const data = await response.json();
      setNote(data);
    } catch (err) {
      console.error('Error fetching note:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNote(noteId);
  }, [noteId]);

  const {
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    activeSegmentIndex,
    togglePlay,
    seek,
    setRate,
  } = useAudioSync(note?.audioUrl || '/api/audio/demo', note?.durationSec || 165, note?.segments || []);

  const handleToggleAction = async (actionId: string) => {
    if (!note) return;

    // Optimistic UI update
    setNote((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        actionItems: prev.actionItems.map((a) =>
          a.id === actionId ? { ...a, completed: !a.completed } : a
        ),
      };
    });

    try {
      await fetch(`/api/actions/${actionId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-init-data': initData,
        },
      });
    } catch (err) {
      console.error('Failed to toggle action item:', err);
    }
  };

  const handleAddAction = async (task: string) => {
    if (!note) return;

    try {
      const response = await fetch('/api/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-init-data': initData,
        },
        body: JSON.stringify({
          noteId: note.id,
          task,
          priority: 'medium',
        }),
      });

      if (response.ok) {
        const created = await response.json();
        setNote((prev) => (prev ? { ...prev, actionItems: [...prev.actionItems, created] } : null));
      }
    } catch (err) {
      console.error('Failed to add action item:', err);
    }
  };

  const filteredSegments = note
    ? note.segments.filter((seg) =>
        searchQuery ? seg.text.toLowerCase().includes(searchQuery.toLowerCase()) : true
      )
    : [];

  const completedActionsCount = note ? note.actionItems.filter((a) => a.completed).length : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between max-w-lg mx-auto pb-44 selection:bg-indigo-500/30">
      {/* Top Header */}
      <header className="sticky top-0 z-40 glass-panel px-4 py-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-bold text-sm tracking-tight text-white">VoiceBrief</span>
              <span className="text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded">
                AI
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              {user ? `Welcome, ${user.first_name}` : 'Voice Note Intelligence'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {note && (
            <ExportNoteButton
              title={note.title}
              durationSec={note.durationSec}
              tldr={note.tldr}
              keyDecisions={note.keyDecisions}
              actionItems={note.actionItems}
              segments={note.segments}
            />
          )}

          <button
            onClick={() => {
              hapticImpact('light');
              fetchNote(note?.id || 'demo');
            }}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-xl border border-slate-700/80 transition-colors"
            title="Reload note"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 flex flex-col gap-4">
        {/* Navigation Tabs */}
        <nav className="grid grid-cols-4 bg-slate-900/90 p-1 rounded-2xl border border-slate-800 text-xs font-medium">
          <button
            onClick={() => {
              hapticImpact('light');
              setActiveTab('summary');
            }}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'summary'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Summary</span>
          </button>

          <button
            onClick={() => {
              hapticImpact('light');
              setActiveTab('actions');
            }}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'actions'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListChecks className="w-3.5 h-3.5" />
            <span>Actions</span>
            {note && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                {completedActionsCount}/{note.actionItems.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              hapticImpact('light');
              setActiveTab('transcript');
            }}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'transcript'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Transcript</span>
          </button>

          <button
            onClick={() => {
              hapticImpact('light');
              setActiveTab('upload');
            }}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'upload'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload</span>
          </button>
        </nav>

        {/* Loading state */}
        {isLoading && (
          <div className="glass-panel p-12 text-center rounded-2xl flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
            <span className="text-xs text-slate-400">Loading audio intelligence...</span>
          </div>
        )}

        {/* Tab Views */}
        {!isLoading && note && (
          <>
            {activeTab === 'summary' && (
              <ExecutiveSummary
                title={note.title}
                durationSec={note.durationSec}
                tldr={note.tldr}
                keyDecisions={note.keyDecisions}
                actionItemsTotal={note.actionItems.length}
                actionItemsCompleted={completedActionsCount}
                segmentsCount={note.segments.length}
              />
            )}

            {activeTab === 'actions' && (
              <ActionItemsList
                items={note.actionItems}
                onToggleItem={handleToggleAction}
                onAddItem={handleAddAction}
              />
            )}

            {activeTab === 'transcript' && (
              <div className="flex flex-col gap-3">
                <TranscriptSearch
                  value={searchQuery}
                  onChange={setSearchQuery}
                  matchCount={searchQuery ? filteredSegments.length : undefined}
                />
                <TimestampedTranscript
                  segments={filteredSegments}
                  activeSegmentIndex={activeSegmentIndex}
                  onSeek={seek}
                  searchQuery={searchQuery}
                />
              </div>
            )}

            {activeTab === 'upload' && (
              <DirectAudioUpload
                onUploadSuccess={(newNote) => {
                  setNote(newNote);
                  setActiveTab('summary');
                }}
                onCancel={() => setActiveTab('summary')}
              />
            )}
          </>
        )}
      </main>

      {/* Sticky Bottom Waveform Player Dock */}
      {note && (
        <footer className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-3 z-50 pointer-events-auto">
          <WaveformPlayer
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            peaks={note.waveformPeaks}
            playbackRate={playbackRate}
            onTogglePlay={togglePlay}
            onSeek={seek}
            onRateChange={setRate}
          />
        </footer>
      )}
    </div>
  );
}
