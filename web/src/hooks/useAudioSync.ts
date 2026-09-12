import { useState, useEffect, useRef, useCallback } from 'react';

export interface AudioSegment {
  id: string;
  start: number;
  end: number;
  speaker: string;
  text: string;
}

export function useAudioSync(audioUrl: string, initialDuration = 0, segments: AudioSegment[] = []) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.25 | 1.5 | 2>(1);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(-1);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      const cur = audio.currentTime;
      setCurrentTime(cur);

      // Find active segment
      const idx = segments.findIndex((seg) => cur >= seg.start && cur <= seg.end);
      setActiveSegmentIndex(idx);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setActiveSegmentIndex(-1);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audioRef.current = null;
    };
  }, [audioUrl, segments]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.warn('Playback prevented:', err));
    }
  }, [isPlaying]);

  const seek = useCallback((timeInSeconds: number) => {
    if (!audioRef.current) return;
    const clamped = Math.max(0, Math.min(audioRef.current.duration || 9999, timeInSeconds));
    audioRef.current.currentTime = clamped;
    setCurrentTime(clamped);
  }, []);

  const setRate = useCallback((rate: 1 | 1.25 | 1.5 | 2) => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  }, []);

  return {
    isPlaying,
    currentTime,
    duration: duration || initialDuration,
    playbackRate,
    activeSegmentIndex,
    togglePlay,
    seek,
    setRate,
  };
}
