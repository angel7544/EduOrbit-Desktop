import React, { useRef, useMemo, useState } from 'react';
import { MediaPlayer, MediaProvider, MediaPlayerInstance } from '@vidstack/react';
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';

interface VideoPlayerProps {
  url: string;
  isDarkMode?: boolean;
  onEnded?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  isCompleted?: boolean;
  onMarkComplete?: () => void;
  onUnmarkComplete?: () => void;
  videoKey?: string;
  title?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  url,
  onEnded,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  isCompleted,
  onMarkComplete,
  onUnmarkComplete,
  videoKey,
  title
}) => {
  const playerRef = useRef<MediaPlayerInstance>(null);
  const lastRestoredKeyRef = useRef<string | null>(null);
  const [fitMode, setFitMode] = useState<'cover' | 'contain' | 'fill'>('contain');

  // Normalize URL
  const normalizedUrl = useMemo(() => {
    if (!url) return '';
    let u = url.trim();
    if (u.startsWith('http://') && !u.includes('localhost') && !u.includes('127.0.0.1')) {
      u = u.replace('http://', 'https://');
    }
    try {
      u = encodeURI(decodeURI(u));
    } catch {
      u = encodeURI(u);
    }
    return u;
  }, [url]);

  // Extract YouTube ID if applicable
  const youtubeId = useMemo(() => {
    if (!normalizedUrl) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|live\/)([^#&?]*).*/;
    const match = normalizedUrl.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  }, [normalizedUrl]);

  // Compute playable stream URL
  const playableStreamUrl = useMemo(() => {
    if (!normalizedUrl) return '';
    if (normalizedUrl.includes('hranker.com')) {
      return `https://proxy.br31tech.in/?url=${encodeURIComponent(normalizedUrl)}`;
    }
    return normalizedUrl;
  }, [normalizedUrl]);

  // Vidstack explicit media source configuration
  const mediaSource = useMemo(() => {
    if (!playableStreamUrl) return '';
    if (youtubeId) {
      return `youtube/${youtubeId}`;
    }
    const isHls = normalizedUrl.toLowerCase().includes('.m3u8') || playableStreamUrl.toLowerCase().includes('.m3u8');
    if (isHls) {
      return {
        src: playableStreamUrl,
        type: 'application/x-mpegurl' as const
      };
    }
    return playableStreamUrl;
  }, [playableStreamUrl, normalizedUrl, youtubeId]);

  // Handle progress saving
  const handleTimeUpdate = (detail: { currentTime: number }) => {
    const time = detail.currentTime;
    const dur = playerRef.current?.state.duration || 0;
    if (videoKey && dur > 0 && time > 0) {
      if (time / dur >= 0.96 || dur - time < 5) {
        localStorage.removeItem(`video_progress_${videoKey}`);
      } else {
        localStorage.setItem(`video_progress_${videoKey}`, time.toString());
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoKey && lastRestoredKeyRef.current !== videoKey && playerRef.current) {
      const saved = localStorage.getItem(`video_progress_${videoKey}`);
      const savedTime = saved ? parseFloat(saved) : 0;
      if (savedTime > 0) {
        playerRef.current.currentTime = savedTime;
      }
      lastRestoredKeyRef.current = videoKey;
    }
  };

  if (!url) {
    return (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-gray-900 text-gray-400">
        No video URL provided.
      </div>
    );
  }

  const fitClass = fitMode === 'cover'
    ? 'object-cover [&>video]:object-cover'
    : fitMode === 'fill'
    ? 'object-fill [&>video]:object-fill'
    : 'object-contain [&>video]:object-contain';

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden rounded-xl group">
      {/* Top Navigation Overlay */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-auto">
        <h3 className="text-white font-bold text-sm md:text-base truncate max-w-[50%] m-0">
          {title || 'Video Player'}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFitMode((prev: 'cover' | 'contain' | 'fill') => prev === 'cover' ? 'contain' : prev === 'contain' ? 'fill' : 'cover')}
            className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-sm transition-colors border-0 cursor-pointer capitalize"
            title="Toggle Fit Mode (Cover / Contain / Fill)"
          >
            Fit: {fitMode}
          </button>
          {hasPrev && (
            <button
              onClick={onPrev}
              className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold flex items-center gap-1 backdrop-blur-sm transition-colors border-0 cursor-pointer"
            >
              <ChevronLeft size={16} /> Prev
            </button>
          )}
          {hasNext && (
            <button
              onClick={onNext}
              className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold flex items-center gap-1 backdrop-blur-sm transition-colors border-0 cursor-pointer"
            >
              Next <ChevronRight size={16} />
            </button>
          )}
          {onMarkComplete && (
            <button
              onClick={isCompleted ? onUnmarkComplete : onMarkComplete}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 backdrop-blur-sm transition-colors border-0 cursor-pointer ${
                isCompleted
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              <CheckCircle2 size={16} />
              {isCompleted ? 'Completed' : 'Mark Complete'}
            </button>
          )}
        </div>
      </div>

      {/* High-Performance Vidstack Media Player - Full Screen Fit */}
      <MediaPlayer
        ref={playerRef}
        title={title || 'Video Stream'}
        src={mediaSource}
        onEnded={onEnded}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        autoplay
        playsInline
        className={`w-full h-full min-h-full min-w-full flex-1 ${fitClass}`}
      >
        <MediaProvider className={`w-full h-full ${fitClass}`} />
        <DefaultVideoLayout icons={defaultLayoutIcons} />
      </MediaPlayer>
    </div>
  );
};
