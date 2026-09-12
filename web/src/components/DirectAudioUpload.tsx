import type { FC, FormEvent, ChangeEvent } from 'react';
import { useState } from 'react';
import { UploadCloud, FileAudio, Loader2 } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';

interface DirectAudioUploadProps {
  onUploadSuccess: (newNote: any) => void;
  onCancel: () => void;
}

export const DirectAudioUpload: FC<DirectAudioUploadProps> = ({
  onUploadSuccess,
  onCancel,
}) => {
  const { hapticNotification } = useTelegram();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Upload failed');
      }

      const note = await response.json();
      hapticNotification('success');
      onUploadSuccess(note);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      hapticNotification('error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
      <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
        <UploadCloud className="w-5 h-5" />
        <span>Direct Audio Upload</span>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">
        Upload any voice memo or audio recording (.mp3, .wav, .m4a, .oga) for instant AI transcription and action extraction.
      </p>

      <form onSubmit={handleUpload} className="flex flex-col gap-4">
        <label className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-900/40">
          <FileAudio className="w-8 h-8 text-indigo-400 mb-2" />
          <span className="text-xs font-medium text-slate-200 text-center">
            {file ? file.name : 'Click or drop audio file here'}
          </span>
          <span className="text-[10px] text-slate-500 mt-1">Up to 50MB</span>
          <input
            type="file"
            accept="audio/*,.oga,.ogg,.mp3,.wav,.m4a"
            onChange={handleFileChange}
            className="hidden"
            disabled={isUploading}
          />
        </label>

        {error && (
          <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isUploading}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold py-2.5 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!file || isUploading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>Transcribe & Extract</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
