import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, Subtitles, ListMusic, ListVideo, ChevronRight, SkipBack, SkipForward, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

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
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  url, isDarkMode, onEnded, 
  hasPrev, hasNext, onPrev, onNext, 
  isCompleted, onMarkComplete 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [activeSettingsMenu, setActiveSettingsMenu] = useState<'main' | 'speed' | 'audio' | 'quality'>('main');
  const [audioTracks, setAudioTracks] = useState<any[]>([]);
  const [currentAudioTrack, setCurrentAudioTrack] = useState(-1);
  const [qualityLevels, setQualityLevels] = useState<any[]>([]);
  const [currentQualityLevel, setCurrentQualityLevel] = useState(-1);
  
  // Watermark state
  const { user } = useAuthStore();
  const [watermarkPos, setWatermarkPos] = useState({ top: 10, left: 10 });

  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<number | null>(null);
  const watermarkIntervalRef = useRef<number | null>(null);

  const getYoutubeId = (videoUrl: string) => {
    if (!videoUrl) return null;
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = videoUrl.match(regex);
    return match ? match[1] : null;
  };

  const ytId = getYoutubeId(url);

  // Set up HLS or normal source
  useEffect(() => {
    if (ytId) return;

    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    if (url.includes('.m3u8')) {
      if (Hls.isSupported()) {
        hls = new Hls({
          maxMaxBufferLength: 10,
          enableWorker: true,
        });
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (hls) {
            setQualityLevels(hls.levels || []);
            setCurrentQualityLevel(hls.currentLevel);
            setAudioTracks(hls.audioTracks || []);
            setCurrentAudioTrack(hls.audioTrack);
          }
        });

        hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_, data) => {
          setCurrentAudioTrack(data.id);
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
          setCurrentQualityLevel(data.level);
        });

        hls.loadSource(url);
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        video.src = url;
      }
    } else {
      // Normal MP4 / MKV
      video.src = url;
    }

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.duration > 0 && !isCompleted && onMarkComplete) {
        if (video.currentTime / video.duration >= 0.9) {
          onMarkComplete();
        }
      }
    };
    const handleDurationChange = () => setDuration(video.duration);
    const handleVideoEnded = () => {
      setIsPlaying(false);
      if (onEnded) onEnded();
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('ended', handleVideoEnded);

    return () => {
      if (hls) {
        hls.destroy();
        hlsRef.current = null;
      }
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('ended', handleVideoEnded);
    };
  }, [url, ytId]);

  // Anti-piracy watermark randomizer
  useEffect(() => {
    if (isPlaying) {
      watermarkIntervalRef.current = window.setInterval(() => {
        // Generate random position between 5% and 85% to keep it mostly inside the frame
        const top = Math.floor(Math.random() * 80) + 5;
        const left = Math.floor(Math.random() * 80) + 5;
        setWatermarkPos({ top, left });
      }, 5000); // jump every 5 seconds
    } else {
      if (watermarkIntervalRef.current) {
        window.clearInterval(watermarkIntervalRef.current);
      }
    }

    return () => {
      if (watermarkIntervalRef.current) {
        window.clearInterval(watermarkIntervalRef.current);
      }
    };
  }, [isPlaying]);

  // Controls visibility timeout on mouse move
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowSettingsMenu(false);
        setActiveSettingsMenu('main');
      }
    }, 2500);
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        window.clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  if (ytId) {
    // Youtube Embed player (Hides native download/share where possible inside restrictions of iframe)
    return (
      <div className="w-full aspect-video bg-black relative rounded-2xl overflow-hidden shadow-lg group">
        <iframe
          src={`https://www.youtube.com/embed/${ytId}?autoplay=1&modestbranding=1&rel=0&showinfo=0&controls=1`}
          className="w-full h-full border-none"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  // Custom Video HTML5 + HLS/MP4/MKV Player
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(err => console.error("Playback error:", err));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const seekTime = parseFloat(e.target.value);
    video.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handleSpeedChange = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackRate(speed);
    setActiveSettingsMenu('main');
    setShowSettingsMenu(false);
  };

  const handleAudioTrackChange = (trackId: number) => {
    if (hlsRef.current) {
      hlsRef.current.audioTrack = trackId;
      setCurrentAudioTrack(trackId);
    }
    setActiveSettingsMenu('main');
    setShowSettingsMenu(false);
  };

  const handleQualityChange = (level: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = level;
      setCurrentQualityLevel(level);
    }
    setActiveSettingsMenu('main');
    setShowSettingsMenu(false);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if ((video as any).webkitRequestFullscreen) { /* Safari */
      (video as any).webkitRequestFullscreen();
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div 
      className="w-full aspect-video bg-black relative rounded-2xl overflow-hidden shadow-lg group select-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (isPlaying) {
          setShowControls(false);
          setShowSettingsMenu(false);
          setActiveSettingsMenu('main');
        }
      }}
      onContextMenu={(e) => e.preventDefault()} // Disable right-click menu to prevent downloading
    >
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
          {user.phone || user.email || user.name}
        </div>
      )}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        controlsList="nodownload" // Prevent default browser download button
        onClick={togglePlay}
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* Custom Overlay Controls */}
      <div 
        className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 flex flex-col justify-between p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        {/* Top bar controls */}
        <div className="flex justify-between items-center">
          <span className="text-white text-xs font-semibold px-3 py-1 rounded bg-black/45 backdrop-blur-sm">
            {playbackRate}x Speed
          </span>
        </div>

        {/* Bottom controls panel */}
        <div className="flex flex-col gap-3">
          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <span className="text-white text-xs font-medium">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <span className="text-white text-xs font-medium">{formatTime(duration)}</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-4">
              {/* Prev / Play / Next */}
              <div className="flex items-center gap-3">
                {hasPrev && (
                  <button onClick={onPrev} className="text-white hover:text-primary transition-colors bg-transparent border-none cursor-pointer">
                    <SkipBack size={18} fill="currentColor" />
                  </button>
                )}
                <button 
                  onClick={togglePlay}
                  className="text-white hover:text-primary transition-colors bg-transparent border-none cursor-pointer"
                >
                  {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
                </button>
                {hasNext && (
                  <button onClick={onNext} className="text-white hover:text-primary transition-colors bg-transparent border-none cursor-pointer">
                    <SkipForward size={18} fill="currentColor" />
                  </button>
                )}
              </div>

              {/* Volume */}
              <div className="flex items-center gap-2 group/volume">
                <button 
                  onClick={toggleMute}
                  className="text-white hover:text-primary transition-colors bg-transparent border-none cursor-pointer"
                >
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-white hover:accent-primary transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 relative">
              {/* Mark Complete */}
              {onMarkComplete && (
                <button 
                  onClick={onMarkComplete}
                  disabled={isCompleted}
                  className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-none text-xs font-bold transition-colors ${
                    isCompleted 
                      ? 'bg-green-500/20 text-green-400 cursor-default' 
                      : 'bg-primary/20 text-white hover:bg-primary/40 cursor-pointer'
                  }`}
                >
                  <CheckCircle2 size={14} />
                  {isCompleted ? 'Completed' : 'Mark Complete'}
                </button>
              )}

              {/* Settings Menu trigger */}
              <button 
                onClick={() => {
                  setShowSettingsMenu(!showSettingsMenu);
                  setActiveSettingsMenu('main');
                }}
                className={`text-white hover:text-primary transition-colors font-bold text-sm bg-transparent border-none cursor-pointer flex items-center gap-1 ${showSettingsMenu ? 'text-primary' : ''}`}
              >
                <Settings size={18} className={`${showSettingsMenu ? 'rotate-90' : ''} transition-transform`} />
              </button>

              {/* Advanced Settings Menu */}
              {showSettingsMenu && (
                <div className="absolute bottom-10 right-0 bg-black/95 border border-white/10 rounded-xl w-48 py-2 flex flex-col gap-1 backdrop-blur-md shadow-2xl z-50">
                  {activeSettingsMenu === 'main' && (
                    <>
                      <button onClick={() => setActiveSettingsMenu('speed')} className="flex items-center justify-between px-4 py-2 text-sm text-white/90 hover:bg-white/10 cursor-pointer border-none bg-transparent">
                        <div className="flex items-center gap-2"><Play size={14} /> Speed</div>
                        <div className="flex items-center gap-1 text-xs text-white/50">{playbackRate === 1 ? 'Normal' : `${playbackRate}x`} <ChevronRight size={14} /></div>
                      </button>
                      
                      {audioTracks.length > 1 && (
                        <button onClick={() => setActiveSettingsMenu('audio')} className="flex items-center justify-between px-4 py-2 text-sm text-white/90 hover:bg-white/10 cursor-pointer border-none bg-transparent">
                          <div className="flex items-center gap-2"><ListMusic size={14} /> Audio Track</div>
                          <div className="flex items-center gap-1 text-xs text-white/50">{audioTracks[currentAudioTrack]?.name || `Track ${currentAudioTrack + 1}`} <ChevronRight size={14} /></div>
                        </button>
                      )}

                      {qualityLevels.length > 0 && (
                        <button onClick={() => setActiveSettingsMenu('quality')} className="flex items-center justify-between px-4 py-2 text-sm text-white/90 hover:bg-white/10 cursor-pointer border-none bg-transparent">
                          <div className="flex items-center gap-2"><Settings size={14} /> Quality</div>
                          <div className="flex items-center gap-1 text-xs text-white/50">
                            {currentQualityLevel === -1 ? 'Auto' : `${qualityLevels[currentQualityLevel]?.height}p`} <ChevronRight size={14} />
                          </div>
                        </button>
                      )}
                    </>
                  )}

                  {activeSettingsMenu === 'speed' && (
                    <>
                      <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2 font-semibold text-sm text-white">
                        <button onClick={() => setActiveSettingsMenu('main')} className="p-1 hover:bg-white/10 rounded cursor-pointer border-none bg-transparent text-white"><ChevronRight size={14} className="rotate-180" /></button> Playback Speed
                      </div>
                      <div className="flex flex-col py-1">
                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                          <button key={speed} onClick={() => handleSpeedChange(speed)} className={`text-left px-8 py-2 text-sm cursor-pointer border-none bg-transparent transition-colors ${playbackRate === speed ? 'text-primary font-bold bg-primary/10' : 'text-white/80 hover:bg-white/10'}`}>
                            {speed === 1 ? 'Normal' : `${speed}x`}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {activeSettingsMenu === 'audio' && (
                    <>
                      <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2 font-semibold text-sm text-white">
                        <button onClick={() => setActiveSettingsMenu('main')} className="p-1 hover:bg-white/10 rounded cursor-pointer border-none bg-transparent text-white"><ChevronRight size={14} className="rotate-180" /></button> Audio Track
                      </div>
                      <div className="flex flex-col py-1 max-h-40 overflow-y-auto">
                        {audioTracks.map((track, idx) => (
                          <button key={idx} onClick={() => handleAudioTrackChange(idx)} className={`text-left px-8 py-2 text-sm cursor-pointer border-none bg-transparent transition-colors ${currentAudioTrack === idx ? 'text-primary font-bold bg-primary/10' : 'text-white/80 hover:bg-white/10'}`}>
                            {track.name || `Track ${idx + 1}`}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {activeSettingsMenu === 'quality' && (
                    <>
                      <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2 font-semibold text-sm text-white">
                        <button onClick={() => setActiveSettingsMenu('main')} className="p-1 hover:bg-white/10 rounded cursor-pointer border-none bg-transparent text-white"><ChevronRight size={14} className="rotate-180" /></button> Quality
                      </div>
                      <div className="flex flex-col py-1 max-h-40 overflow-y-auto">
                        <button onClick={() => handleQualityChange(-1)} className={`text-left px-8 py-2 text-sm cursor-pointer border-none bg-transparent transition-colors ${currentQualityLevel === -1 ? 'text-primary font-bold bg-primary/10' : 'text-white/80 hover:bg-white/10'}`}>
                          Auto
                        </button>
                        {qualityLevels.map((level, idx) => (
                          <button key={idx} onClick={() => handleQualityChange(idx)} className={`text-left px-8 py-2 text-sm cursor-pointer border-none bg-transparent transition-colors ${currentQualityLevel === idx ? 'text-primary font-bold bg-primary/10' : 'text-white/80 hover:bg-white/10'}`}>
                            {level.height}p {level.bitrate ? `(${Math.round(level.bitrate / 1024)} kbps)` : ''}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Fullscreen */}
              <button 
                onClick={toggleFullscreen}
                className="text-white hover:text-primary transition-colors bg-transparent border-none cursor-pointer"
              >
                <Maximize size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
