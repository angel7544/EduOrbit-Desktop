import React, { useEffect, useRef, useState } from 'react';
import { SkipBack, SkipForward, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import { 
  MediaPlayer, 
  MediaProvider, 
  MediaPlayerInstance,
  MediaTimeUpdateEventDetail,
  useMediaState
} from '@vidstack/react';
import { 
  defaultLayoutIcons, 
  DefaultVideoLayout 
} from '@vidstack/react/player/layouts/default';

interface VideoPlayerProps {
  url: string;
  isDarkMode: boolean;
  onEnded?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  isCompleted?: boolean;
  onMarkComplete?: () => void;
  onUnmarkComplete?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  url, isDarkMode, onEnded, 
  hasPrev, hasNext, onPrev, onNext, 
  isCompleted, onMarkComplete, onUnmarkComplete 
}) => {
  const playerRef = useRef<MediaPlayerInstance>(null);
  const controlsVisible = useMediaState('controlsVisible', playerRef);
  
  // Watermark state
  const { user } = useAuthStore();
  const [watermarkPos, setWatermarkPos] = useState({ top: 10, left: 10 });
  const watermarkIntervalRef = useRef<number | null>(null);

  // Anti-piracy watermark randomizer
  useEffect(() => {
    if (user) {
      watermarkIntervalRef.current = window.setInterval(() => {
        // Generate random position between 5% and 85% to keep it mostly inside the frame
        const top = Math.floor(Math.random() * 80) + 5;
        const left = Math.floor(Math.random() * 80) + 5;
        setWatermarkPos({ top, left });
      }, 5000); // jump every 5 seconds
    }

    return () => {
      if (watermarkIntervalRef.current) {
        window.clearInterval(watermarkIntervalRef.current);
      }
    };
  }, [user]);

  const handleTimeUpdate = (detail: MediaTimeUpdateEventDetail) => {
    const time = detail.currentTime;
    const duration = playerRef.current?.state.duration || 0;
    
    if (duration > 0 && !isCompleted && onMarkComplete) {
      if (time / duration >= 0.9) {
        onMarkComplete();
      }
    }
  };

  return (
    <div className="w-full aspect-video bg-black relative rounded-2xl overflow-hidden shadow-lg select-none">
      <MediaPlayer
        className="w-full h-full"
        title="Course Video"
        src={url}
        autoPlay
        playsInline
        fullscreenOrientation="landscape"
        viewType="video"
        crossOrigin
        onEnded={onEnded}
        onTimeUpdate={handleTimeUpdate}
        ref={playerRef}
      >
        <MediaProvider>
          {/* Anti-piracy Watermark */}
          {user && (
            <div 
              className="absolute z-10 pointer-events-none select-none text-white/90 text-xs sm:text-sm md:text-base font-bold whitespace-nowrap mix-blend-overlay transition-all duration-[3000ms] ease-in-out"
              style={{ 
                top: `${watermarkPos.top}%`, 
                left: `${watermarkPos.left}%`,
                transform: 'rotate(-15deg)',
                textShadow: '0px 0px 3px rgba(0,0,0,0.5)'
              }}
            >
              {user.phone ? `${user.phone} ` : ''}@{user.name ? user.name.substring(0, 5) : user.email?.split('@')[0].substring(0, 5)}
            </div>
          )}
        </MediaProvider>
        <DefaultVideoLayout 
          icons={defaultLayoutIcons} 
          colorScheme={isDarkMode ? 'dark' : 'light'} 
        />
      </MediaPlayer>

      {/* Custom Action Buttons Overlay (Top Right) */}
      <div 
        className={`absolute top-4 right-4 z-20 flex gap-2 transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {hasPrev && (
          <button 
            onClick={onPrev} 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/10 text-xs font-bold transition-all cursor-pointer shadow-lg"
          >
            <SkipBack size={14} fill="currentColor" />
            Prev
          </button>
        )}
        
        {hasNext && (
          <button 
            onClick={onNext} 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/10 text-xs font-bold transition-all cursor-pointer shadow-lg"
          >
            Next
            <SkipForward size={14} fill="currentColor" />
          </button>
        )}

        {(onMarkComplete || onUnmarkComplete) && (
          <button 
            onClick={() => {
              if (isCompleted && onUnmarkComplete) {
                if (window.confirm("Are you sure you want to unmark this as completed?")) {
                  onUnmarkComplete();
                }
              } else if (!isCompleted && onMarkComplete) {
                onMarkComplete();
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-bold transition-all shadow-lg ${
              isCompleted 
                ? 'bg-green-500/80 hover:bg-red-500/80 text-white cursor-pointer backdrop-blur-md' 
                : 'bg-primary/80 hover:bg-primary text-white cursor-pointer backdrop-blur-md'
            }`}
          >
            <CheckCircle2 size={14} />
            {isCompleted ? 'Completed' : 'Mark Complete'}
          </button>
        )}
      </div>
    </div>
  );
};
