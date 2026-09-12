import type { FC } from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Pause, Play, X, Loader2 } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';

interface AudioRecorderProps {
  onUploadSuccess: (newNote: any) => void;
  onCancel: () => void;
}

export const AudioRecorder: FC<AudioRecorderProps> = ({ onUploadSuccess, onCancel }) => {
  const { hapticImpact, hapticNotification } = useTelegram();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    setError(null);
    audioChunksRef.current = [];
    setRecordDuration(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setIsPaused(false);
      hapticImpact('medium');

      timerRef.current = window.setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setError(
        'Microphone access was denied or not supported in this browser. Please grant permission.'
      );
      hapticNotification('error');
    }
  }, [hapticImpact, hapticNotification]);

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current || !isRecording) return;

    hapticImpact('heavy');
    setIsRecording(false);
    setIsPaused(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    mediaRecorderRef.current.onstop = async () => {
      setIsProcessing(true);
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const audioFile = new File([audioBlob], `recording_${Date.now()}.webm`, {
        type: 'audio/webm',
      });

      // Cleanup tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      const formData = new FormData();
      formData.append('file', audioFile);

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to upload recorded audio');
        }

        const note = await response.json();
        hapticNotification('success');
        onUploadSuccess(note);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
        hapticNotification('error');
      } finally {
        setIsProcessing(false);
      }
    };

    mediaRecorderRef.current.stop();
  }, [isRecording, hapticImpact, hapticNotification, onUploadSuccess]);

  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    hapticImpact('light');

    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = window.setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isPaused, hapticImpact]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass-panel p-6 rounded-2xl flex flex-col items-center gap-5 relative">
      <button
        onClick={() => {
          if (isRecording) {
            if (streamRef.current) {
              streamRef.current.getTracks().forEach((t) => t.stop());
            }
          }
          onCancel();
        }}
        className="absolute right-4 top-4 text-slate-500 hover:text-slate-300 p-1 rounded-lg"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="text-center">
        <h3 className="text-base font-bold font-display text-white">Record Audio Memo</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Capture thoughts or meetings directly from your microphone
        </p>
      </div>

      {/* Recording Animation & Timer */}
      <div className="relative flex items-center justify-center my-4">
        {isRecording && (
          <div className="absolute w-32 h-32 rounded-full bg-rose-500/10 animate-ping" />
        )}
        <div
          className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
            isRecording
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}
        >
          <Mic className={`w-10 h-10 ${isRecording ? 'animate-pulse' : ''}`} />
        </div>
      </div>

      <div className="text-2xl font-mono font-bold tracking-wider text-slate-100">
        {formatSeconds(recordDuration)}
      </div>

      {error && (
        <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg text-center max-w-xs">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3 mt-2">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={isProcessing}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/25 transition-all active:scale-95"
          >
            <Mic className="w-4 h-4" />
            <span>Start Recording</span>
          </button>
        ) : (
          <>
            <button
              onClick={togglePause}
              disabled={isProcessing}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold p-3 rounded-xl transition-all"
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
            </button>

            <button
              onClick={stopRecording}
              disabled={isProcessing}
              className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-rose-600/25 transition-all active:scale-95"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 fill-current" />
                  <span>Finish & Transcribe</span>
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
