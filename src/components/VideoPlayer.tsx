import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Hls from 'hls.js';
import {
  Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX,
  Maximize, Minimize, Settings, SkipBack, SkipForward,
  CheckCircle2, Radio, AlertCircle, Loader2, PictureInPicture2,
  BookOpen
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

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

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

// Utility: format seconds to MM:SS or HH:MM:SS
function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

// Utility: Extract YouTube Video ID
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|live\/)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  url,
  isDarkMode = true,
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
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytContainerId = useRef(`yt-player-${Math.random().toString(36).substring(2, 9)}`);

  const { user } = useAuthStore();

  // Normalize URL (upgrade http to https for external CDNs to prevent mixed-content blocks)
  const normalizedUrl = useMemo(() => {
    if (!url) return '';
    let u = url.trim();
    if (u.startsWith('http://') && !u.includes('localhost') && !u.includes('127.0.0.1')) {
      u = u.replace('http://', 'https://');
    }
    return u;
  }, [url]);

  const youtubeId = useMemo(() => extractYouTubeId(normalizedUrl), [normalizedUrl]);
  const isM3U8 = useMemo(() => normalizedUrl?.toLowerCase().includes('.m3u8'), [normalizedUrl]);

  // Compute final playable stream URL (proxy external m3u8 playlists through stream-proxy to ensure 100% CORS reliability)
  const playableStreamUrl = useMemo(() => {
    if (!normalizedUrl || youtubeId) return normalizedUrl;
    if (normalizedUrl.startsWith('/api/') || normalizedUrl.includes('localhost') || normalizedUrl.includes('127.0.0.1')) {
      return normalizedUrl;
    }
    if (isM3U8 || normalizedUrl.includes('hranker.com')) {
      return `/api/stream-proxy?url=${encodeURIComponent(normalizedUrl)}`;
    }
    return normalizedUrl;
  }, [normalizedUrl, youtubeId, isM3U8]);

  // Playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  // Quality levels for HLS
  const [qualities, setQualities] = useState<{ id: number; label: string; height: number }[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1); // -1 = Auto

  // Controls UI visibility
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'main' | 'speed' | 'quality'>('main');
  const hideControlsTimerRef = useRef<number | null>(null);

  // Watermark state
  const [watermarkPos, setWatermarkPos] = useState({ top: 12, left: 12 });
  const watermarkIntervalRef = useRef<number | null>(null);

  // Progress restoration ref
  const lastRestoredKeyRef = useRef<string | null>(null);

  // Anti-piracy Watermark jumping position
  useEffect(() => {
    if (user) {
      watermarkIntervalRef.current = window.setInterval(() => {
        const top = Math.floor(Math.random() * 75) + 8;
        const left = Math.floor(Math.random() * 75) + 8;
        setWatermarkPos({ top, left });
      }, 5000);
    }
    return () => {
      if (watermarkIntervalRef.current) clearInterval(watermarkIntervalRef.current);
    };
  }, [user?.id]);

  // Picture in Picture change listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleEnterPip = () => setIsPip(true);
    const handleLeavePip = () => setIsPip(false);
    video.addEventListener('enterpictureinpicture', handleEnterPip);
    video.addEventListener('leavepictureinpicture', handleLeavePip);
    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPip);
      video.removeEventListener('leavepictureinpicture', handleLeavePip);
    };
  }, []);

  const togglePip = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled && videoRef.current.requestPictureInPicture) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.warn('PiP error:', err);
    }
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Controls auto-hide timer
  const resetControlsTimer = useCallback(() => {
    setControlsVisible(true);
    if (hideControlsTimerRef.current) {
      window.clearTimeout(hideControlsTimerRef.current);
    }
    if (isPlaying) {
      hideControlsTimerRef.current = window.setTimeout(() => {
        if (!showSettingsMenu) {
          setControlsVisible(false);
        }
      }, 3500);
    }
  }, [isPlaying, showSettingsMenu]);

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (hideControlsTimerRef.current) window.clearTimeout(hideControlsTimerRef.current);
    };
  }, [isPlaying, resetControlsTimer]);

  // Handle progress saving & auto-completion
  const handleProgress = useCallback((time: number, dur: number) => {
    if (videoKey && dur > 0 && time > 0) {
      if (time / dur >= 0.96 || dur - time < 5) {
        localStorage.removeItem(`video_progress_${videoKey}`);
      } else {
        localStorage.setItem(`video_progress_${videoKey}`, time.toString());
      }
    }

    if (dur > 0 && !isCompleted && onMarkComplete) {
      if (time / dur >= 0.9) {
        onMarkComplete();
      }
    }
  }, [videoKey, isCompleted, onMarkComplete]);

  // ----------------------------------------------------
  // YouTube Engine
  // ----------------------------------------------------
  useEffect(() => {
    if (!youtubeId) return;

    setError(null);
    setIsLoading(true);
    setCurrentTime(0);
    setDuration(0);
    setQualities([]);

    let progressInterval: number | null = null;

    const initYT = () => {
      if (!window.YT || !window.YT.Player) return;

      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {
          console.warn('YT destroy err:', e);
        }
      }

      ytPlayerRef.current = new window.YT.Player(ytContainerId.current, {
        videoId: youtubeId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          enablejsapi: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          showinfo: 0,
          cc_load_policy: 0,
          widget_referrer: window.location.origin,
          origin: window.location.origin
        },
        events: {
          onReady: (event: any) => {
            setIsLoading(false);
            const player = event.target;
            const dur = player.getDuration();
            setDuration(dur);
            if (dur === 0) {
              setIsLive(true);
            }

            // Restore saved progress
            if (videoKey && lastRestoredKeyRef.current !== videoKey && dur > 0) {
              const saved = localStorage.getItem(`video_progress_${videoKey}`);
              const savedTime = saved ? parseFloat(saved) : 0;
              if (savedTime > 0 && savedTime < dur - 5) {
                player.seekTo(savedTime, true);
              }
              lastRestoredKeyRef.current = videoKey;
            }

            try {
              player.playVideo();
            } catch (e) {
              // autoplay caught
            }
          },
          onStateChange: (event: any) => {
            if (event.data === 1) {
              setIsPlaying(true);
              setIsLoading(false);
            } else if (event.data === 2) {
              setIsPlaying(false);
              setIsLoading(false);
            } else if (event.data === 3) {
              setIsLoading(true);
            } else if (event.data === 0) {
              setIsPlaying(false);
              setIsLoading(false);
              if (videoKey) localStorage.removeItem(`video_progress_${videoKey}`);
              if (onEnded) onEnded();
            }
          },
          onError: (e: any) => {
            console.error('YouTube player error:', e);
            setIsLoading(false);
            setError('Failed to load YouTube stream. It may be private or restricted.');
          }
        }
      });

      progressInterval = window.setInterval(() => {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
          try {
            const time = ytPlayerRef.current.getCurrentTime() || 0;
            const dur = ytPlayerRef.current.getDuration() || 0;
            const fraction = ytPlayerRef.current.getVideoLoadedFraction() || 0;
            setCurrentTime(time);
            if (dur > 0 && duration !== dur) setDuration(dur);
            setBuffered(fraction * dur);
            handleProgress(time, dur);
          } catch (err) {
            // Player might be destroyed
          }
        }
      }, 500);
    };

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      window.onYouTubeIframeAPIReady = initYT;
    } else {
      initYT();
    }

    return () => {
      if (progressInterval) clearInterval(progressInterval);
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {
          // ignore
        }
        ytPlayerRef.current = null;
      }
    };
  }, [youtubeId, videoKey, handleProgress, onEnded]);

  // ----------------------------------------------------
  // HTML5 / HLS Engine (.m3u8, mp4, etc.)
  // ----------------------------------------------------
  useEffect(() => {
    if (youtubeId || !normalizedUrl) {
      if (!normalizedUrl) setIsLoading(false);
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    setError(null);
    setIsLoading(true);
    setCurrentTime(0);
    setDuration(0);
    setQualities([]);

    let networkRetryCount = 0;
    let mediaRetryCount = 0;
    let hasSwitchedToDirectFallback = false;

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (isM3U8 && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: false, // safer across WebViews and sandboxes
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferHole: 0.5,
        autoStartLoad: true
      });

      hlsRef.current = hls;
      hls.loadSource(playableStreamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setIsLoading(false);
        const mappedQualities = data.levels.map((level, idx) => ({
          id: idx,
          label: level.name || (level.height ? `${level.height}p` : `Stream ${idx + 1}`),
          height: level.height || 0
        }));
        setQualities(mappedQualities);

        // Restore saved progress
        if (videoKey && lastRestoredKeyRef.current !== videoKey) {
          const saved = localStorage.getItem(`video_progress_${videoKey}`);
          const savedTime = saved ? parseFloat(saved) : 0;
          if (savedTime > 0) {
            video.currentTime = savedTime;
          }
          lastRestoredKeyRef.current = videoKey;
        }

        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            setIsPlaying(true);
            setIsLoading(false);
          }).catch((err) => {
            console.log('Autoplay deferred until user click:', err?.message || err);
            setIsPlaying(false);
            setIsLoading(false);
          });
        }
      });

      hls.on(Hls.Events.LEVEL_LOADED, (_, data) => {
        setIsLoading(false);
        if (data.details && data.details.totalduration) {
          setDuration(data.details.totalduration);
          setIsLive(data.details.live);
        }
      });

      hls.on(Hls.Events.FRAG_LOADED, () => {
        setIsLoading(false);
      });

      hls.on(Hls.Events.BUFFER_APPENDED, () => {
        setIsLoading(false);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        setCurrentQuality(hls.autoLevelEnabled ? -1 : data.level);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        console.warn('HLS Event Error:', data);
        if (data.fatal) {
          // If proxy failed, automatically attempt direct source URL before giving up
          if (playableStreamUrl !== normalizedUrl && !hasSwitchedToDirectFallback) {
            hasSwitchedToDirectFallback = true;
            console.log('Stream proxy failed, attempting direct stream playback:', normalizedUrl);
            hls.loadSource(normalizedUrl);
            hls.startLoad();
            return;
          }

          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (networkRetryCount < 3) {
                networkRetryCount++;
                console.log(`Network error, retrying (${networkRetryCount}/3)...`);
                hls.startLoad();
              } else {
                console.error('Fatal network error after 3 retries.');
                setIsLoading(false);
                setError('Network connection error or media stream unavailable. Please check your connection or link.');
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              if (mediaRetryCount < 3) {
                mediaRetryCount++;
                console.log(`Media error, recovering (${mediaRetryCount}/3)...`);
                hls.recoverMediaError();
              } else {
                console.error('Fatal media error after 3 recoveries.');
                setIsLoading(false);
                setError('Media decoding error. The stream codec may be unsupported.');
              }
              break;
            default:
              console.error('Fatal unrecoverable HLS error, destroying...', data);
              hls.destroy();
              // Try direct fallback
              if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = normalizedUrl || playableStreamUrl;
                video.load();
                video.play().catch(() => {
                  setIsPlaying(false);
                  setIsLoading(false);
                });
              } else {
                setError('Failed to play video stream. Please check your connection.');
                setIsLoading(false);
              }
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl') || !isM3U8) {
      // Native HLS or direct MP4/WebM
      video.src = playableStreamUrl;
      video.load();

      if (videoKey && lastRestoredKeyRef.current !== videoKey) {
        const saved = localStorage.getItem(`video_progress_${videoKey}`);
        const savedTime = saved ? parseFloat(saved) : 0;
        if (savedTime > 0) {
          video.currentTime = savedTime;
        }
        lastRestoredKeyRef.current = videoKey;
      }

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setIsPlaying(true);
          setIsLoading(false);
        }).catch(() => {
          setIsPlaying(false);
          setIsLoading(false);
        });
      }
    } else {
      setError('Your browser does not support playing this video format.');
      setIsLoading(false);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [normalizedUrl, youtubeId, isM3U8, videoKey]);

  // Video element event handlers
  const handleVideoTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const time = video.currentTime;
    const dur = video.duration || 0;
    setCurrentTime(time);
    if (dur && !isNaN(dur) && isFinite(dur)) {
      setDuration(dur);
      setIsLive(false);
    } else if (dur === Infinity) {
      setIsLive(true);
    }

    if (video.buffered.length > 0) {
      setBuffered(video.buffered.end(video.buffered.length - 1));
    }

    handleProgress(time, dur);
  };

  const handleVideoLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setIsLoading(false);
    if (video.duration && isFinite(video.duration)) {
      setDuration(video.duration);
    } else {
      setIsLive(true);
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (videoKey) localStorage.removeItem(`video_progress_${videoKey}`);
    if (onEnded) onEnded();
  };

  // ----------------------------------------------------
  // Player Controls Actions
  // ----------------------------------------------------
  const togglePlay = () => {
    if (youtubeId && ytPlayerRef.current) {
      if (isPlaying) {
        ytPlayerRef.current.pauseVideo();
      } else {
        ytPlayerRef.current.playVideo();
      }
    } else if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
          setIsLoading(false);
        }).catch((e) => {
          console.warn('Playback play request rejected:', e);
        });
      }
    }
  };

  const seekBy = (seconds: number) => {
    const target = Math.max(0, Math.min(duration, currentTime + seconds));
    seekTo(target);
  };

  const seekTo = (time: number) => {
    setCurrentTime(time);
    if (youtubeId && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(time, true);
    } else if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    seekTo(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);

    if (youtubeId && ytPlayerRef.current) {
      ytPlayerRef.current.setVolume(val * 100);
      if (val === 0) ytPlayerRef.current.mute();
      else ytPlayerRef.current.unMute();
    } else if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);

    if (youtubeId && ytPlayerRef.current) {
      if (newMuted) ytPlayerRef.current.mute();
      else {
        ytPlayerRef.current.unMute();
        ytPlayerRef.current.setVolume((volume || 1) * 100);
      }
    } else if (videoRef.current) {
      videoRef.current.muted = newMuted;
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    setShowSettingsMenu(false);

    if (youtubeId && ytPlayerRef.current) {
      ytPlayerRef.current.setPlaybackRate(speed);
    } else if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleQualityChange = (levelIndex: number) => {
    setCurrentQuality(levelIndex);
    setShowSettingsMenu(false);

    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.error('Error attempting to exit fullscreen:', err);
      });
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          resetControlsTimer();
          break;
        case 'arrowleft':
        case 'j':
          e.preventDefault();
          seekBy(-10);
          resetControlsTimer();
          break;
        case 'arrowright':
        case 'l':
          e.preventDefault();
          seekBy(10);
          resetControlsTimer();
          break;
        case 'arrowup':
          e.preventDefault();
          setVolume(prev => {
            const next = Math.min(1, prev + 0.1);
            if (videoRef.current) videoRef.current.volume = next;
            if (ytPlayerRef.current) ytPlayerRef.current.setVolume(next * 100);
            return next;
          });
          resetControlsTimer();
          break;
        case 'arrowdown':
          e.preventDefault();
          setVolume(prev => {
            const next = Math.max(0, prev - 0.1);
            if (videoRef.current) videoRef.current.volume = next;
            if (ytPlayerRef.current) ytPlayerRef.current.setVolume(next * 100);
            return next;
          });
          resetControlsTimer();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          resetControlsTimer();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, seekBy, toggleFullscreen, toggleMute, resetControlsTimer]);

  if (!normalizedUrl) {
    return (
      <div className="relative w-full max-w-full max-h-full aspect-video bg-gradient-to-br from-indigo-950/40 via-neutral-900 to-slate-900 rounded-2xl flex flex-col items-center justify-center p-8 text-center border border-indigo-500/20 select-none shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center mb-4 shadow-lg">
          <BookOpen size={30} className="text-indigo-400" />
        </div>
        <h4 className="text-white text-base sm:text-lg font-extrabold mb-1.5 tracking-tight">Study & Assessment Module</h4>
        <p className="text-white/65 text-xs sm:text-sm max-w-md leading-relaxed">This section is focused on reading material, reference resources, assignments, and test assessments.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimer}
      onMouseLeave={() => {
        if (isPlaying && !showSettingsMenu) setControlsVisible(false);
      }}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative w-full max-w-full max-h-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl select-none group flex items-center justify-center ${
        isFullscreen ? 'rounded-none h-screen aspect-auto' : ''
      }`}
    >
      {/* ── YouTube Player Container (With Anti-Branding Crop & Shield) ── */}
      {youtubeId ? (
        <div className="relative w-full h-full overflow-hidden pointer-events-none bg-black">
          <div
            id={ytContainerId.current}
            className="w-full h-full transform scale-[1.32] origin-center"
          />
          {/* Top Shield covering YouTube title, channel name, share icon */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            onContextMenu={(e) => e.preventDefault()}
            className="absolute top-0 left-0 right-0 h-20 pointer-events-auto cursor-pointer z-10 bg-transparent"
          />
          {/* Bottom Right Shield covering YouTube logo and watch on youtube button */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            onContextMenu={(e) => e.preventDefault()}
            className="absolute bottom-0 right-0 w-44 h-16 pointer-events-auto cursor-pointer z-10 bg-transparent"
          />
          {/* Bottom Left Shield */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            onContextMenu={(e) => e.preventDefault()}
            className="absolute bottom-0 left-0 w-32 h-16 pointer-events-auto cursor-pointer z-10 bg-transparent"
          />
        </div>
      ) : (
        /* ── HTML5 / HLS Video Element ── */
        <video
          ref={videoRef}
          playsInline
          onTimeUpdate={handleVideoTimeUpdate}
          onLoadedMetadata={handleVideoLoadedMetadata}
          onCanPlay={() => setIsLoading(false)}
          onCanPlayThrough={() => setIsLoading(false)}
          onLoadedData={() => setIsLoading(false)}
          onPlay={() => {
            setIsPlaying(true);
            setIsLoading(false);
          }}
          onPause={() => setIsPlaying(false)}
          onWaiting={() => {
            if (isPlaying) setIsLoading(true);
          }}
          onPlaying={() => {
            setIsPlaying(true);
            setIsLoading(false);
          }}
          onEnded={handleVideoEnded}
          className="w-full h-full object-contain"
        />
      )}

      {/* ── Center Tap Layer (Toggles Play/Pause) ── */}
      <div
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        className="absolute inset-0 z-10 cursor-pointer"
      />

      {/* ── Prominent Center Play Button (When Paused) ── */}
      {!isPlaying && !error && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          className="absolute inset-0 z-20 flex items-center justify-center pointer-events-auto cursor-pointer bg-black/25 backdrop-blur-[1px] transition-all hover:bg-black/35"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary hover:bg-primary/90 text-white flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-95">
            <Play size={32} fill="currentColor" className="ml-1" />
          </div>
        </div>
      )}

      {/* ── Anti-Piracy Floating Watermark ── */}
      {user && (
        <div
          className="absolute z-20 pointer-events-none select-none text-white/80 text-xs sm:text-sm font-black whitespace-nowrap mix-blend-overlay transition-all duration-[3000ms] ease-in-out drop-shadow-md"
          style={{
            top: `${watermarkPos.top}%`,
            left: `${watermarkPos.left}%`,
            transform: 'rotate(-12deg)',
            textShadow: '0 0 6px rgba(0,0,0,0.8)'
          }}
        >
          {user.phone ? `${user.phone} ` : ''}@{user.name ? user.name.substring(0, 8) : user.email?.split('@')[0]} ({user.id?.substring(0, 5)})
        </div>
      )}

      {/* ── Buffering Spinner ── */}
      {isLoading && !error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/50 backdrop-blur-[2px] pointer-events-none">
          <Loader2 size={44} className="text-primary animate-spin mb-2" />
          <span className="text-white/90 text-xs font-semibold tracking-wider uppercase">Loading Stream...</span>
        </div>
      )}

      {/* ── Error Banner ── */}
      {error && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 p-6 text-center">
          <AlertCircle size={42} className="text-red-500 mb-3" />
          <p className="text-white font-bold text-sm sm:text-base max-w-md mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setIsLoading(true);
              if (videoRef.current) {
                videoRef.current.load();
                videoRef.current.play().catch(() => {});
              }
            }}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg"
          >
            Retry Playback
          </button>
        </div>
      )}

      {/* ── Top Header Bar (Title & Quick Actions) ── */}
      <div
        className={`absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3">
          {isLive && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider animate-pulse shadow-md">
              <Radio size={12} />
              LIVE
            </div>
          )}
          {title && (
            <h3 className="text-white text-sm sm:text-base font-bold truncate max-w-[280px] sm:max-w-md drop-shadow">
              {title}
            </h3>
          )}
        </div>

        {/* Top Right Action Buttons (Prev, Next, Complete) */}
        <div className="flex items-center gap-2">
          {hasPrev && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onPrev) onPrev();
              }}
              title="Previous Lesson"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/90 backdrop-blur-md text-white border border-white/10 text-xs font-bold transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95"
            >
              <SkipBack size={13} fill="currentColor" />
              <span className="hidden sm:inline">Prev</span>
            </button>
          )}

          {hasNext && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onNext) onNext();
              }}
              title="Next Lesson"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/90 backdrop-blur-md text-white border border-white/10 text-xs font-bold transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95"
            >
              <span className="hidden sm:inline">Next</span>
              <SkipForward size={13} fill="currentColor" />
            </button>
          )}

          {(onMarkComplete || onUnmarkComplete) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isCompleted && onUnmarkComplete) {
                  if (window.confirm('Are you sure you want to unmark this as completed?')) {
                    onUnmarkComplete();
                  }
                } else if (!isCompleted && onMarkComplete) {
                  onMarkComplete();
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 text-xs font-bold transition-all shadow-lg cursor-pointer hover:scale-105 active:scale-95 ${
                isCompleted
                  ? 'bg-emerald-600 hover:bg-red-600 text-white backdrop-blur-md'
                  : 'bg-primary hover:bg-primary/90 text-white backdrop-blur-md'
              }`}
            >
              <CheckCircle2 size={13} />
              <span>{isCompleted ? 'Completed' : 'Mark Complete'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Settings Dropdown Menu (Speed & Quality) ── */}
      {showSettingsMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-16 right-4 z-40 w-52 bg-gray-900/95 border border-gray-700/80 backdrop-blur-xl rounded-2xl shadow-2xl p-2 text-white text-xs overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {settingsTab === 'main' && (
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setSettingsTab('speed')}
                className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer border-none bg-transparent text-white"
              >
                <span className="font-semibold text-gray-300">Playback Speed</span>
                <span className="font-bold text-primary">{playbackSpeed}x ›</span>
              </button>

              {qualities.length > 0 && (
                <button
                  onClick={() => setSettingsTab('quality')}
                  className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer border-none bg-transparent text-white"
                >
                  <span className="font-semibold text-gray-300">Quality</span>
                  <span className="font-bold text-primary">
                    {currentQuality === -1 ? 'Auto' : qualities[currentQuality]?.label || 'Auto'} ›
                  </span>
                </button>
              )}
            </div>
          )}

          {settingsTab === 'speed' && (
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setSettingsTab('main')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-gray-400 hover:text-white font-bold cursor-pointer border-none bg-transparent text-left"
              >
                ‹ Back
              </button>
              {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => (
                <button
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl transition-colors cursor-pointer border-none ${
                    playbackSpeed === speed ? 'bg-primary text-white font-bold' : 'hover:bg-white/10 text-gray-200 bg-transparent'
                  }`}
                >
                  <span>{speed === 1 ? 'Normal' : `${speed}x`}</span>
                  {playbackSpeed === speed && <CheckCircle2 size={13} />}
                </button>
              ))}
            </div>
          )}

          {settingsTab === 'quality' && (
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setSettingsTab('main')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-gray-400 hover:text-white font-bold cursor-pointer border-none bg-transparent text-left"
              >
                ‹ Back
              </button>
              <button
                onClick={() => handleQualityChange(-1)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl transition-colors cursor-pointer border-none ${
                  currentQuality === -1 ? 'bg-primary text-white font-bold' : 'hover:bg-white/10 text-gray-200 bg-transparent'
                }`}
              >
                <span>Auto</span>
                {currentQuality === -1 && <CheckCircle2 size={13} />}
              </button>
              {qualities.map((q) => (
                <button
                  key={q.id}
                  onClick={() => handleQualityChange(q.id)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl transition-colors cursor-pointer border-none ${
                    currentQuality === q.id ? 'bg-primary text-white font-bold' : 'hover:bg-white/10 text-gray-200 bg-transparent'
                  }`}
                >
                  <span>{q.label}</span>
                  {currentQuality === q.id && <CheckCircle2 size={13} />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Bottom Controls Bar ── */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute bottom-0 left-0 right-0 z-30 flex flex-col justify-end p-4 pt-8 bg-gradient-to-t from-black/95 via-black/60 to-transparent transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Seek Bar (Hidden for pure live streams without duration) */}
        {!isLive && duration > 0 && (
          <div className="group/seek relative w-full flex items-center mb-3 cursor-pointer">
            {/* Background Track */}
            <div className="w-full h-1.5 group-hover/seek:h-2.5 bg-white/20 rounded-full overflow-hidden relative transition-all duration-200">
              {/* Buffered Bar */}
              <div
                className="absolute top-0 bottom-0 left-0 bg-white/35 transition-all duration-300 rounded-full"
                style={{ width: `${Math.min(100, (buffered / duration) * 100)}%` }}
              />
              {/* Played Bar */}
              <div
                className="absolute top-0 bottom-0 left-0 bg-primary rounded-full transition-all"
                style={{ width: `${Math.min(100, (currentTime / duration) * 100)}%` }}
              />
            </div>

            {/* Slider Input */}
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeekChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
          </div>
        )}

        {/* Action Controls Row */}
        <div className="flex items-center justify-between gap-3 text-white">
          {/* Left Controls: Play/Pause, 10s skips, Volume, Time */}
          <div className="flex items-center gap-3">
            {/* Play/Pause Button */}
            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-transform active:scale-90 cursor-pointer border-none text-white"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
            </button>

            {/* 10s Rewind */}
            {!isLive && (
              <button
                onClick={() => seekBy(-10)}
                className="p-1.5 text-white/80 hover:text-white transition-colors cursor-pointer border-none bg-transparent"
                title="Rewind 10s (Left Arrow)"
              >
                <RotateCcw size={16} />
              </button>
            )}

            {/* 10s Fast Forward */}
            {!isLive && (
              <button
                onClick={() => seekBy(10)}
                className="p-1.5 text-white/80 hover:text-white transition-colors cursor-pointer border-none bg-transparent"
                title="Forward 10s (Right Arrow)"
              >
                <RotateCw size={16} />
              </button>
            )}

            {/* Volume & Mute */}
            <div className="group/vol flex items-center gap-1.5 relative">
              <button
                onClick={toggleMute}
                className="p-1.5 text-white/80 hover:text-white transition-colors cursor-pointer border-none bg-transparent"
                title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
              >
                {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <div className="w-0 group-hover/vol:w-16 overflow-hidden transition-all duration-200 flex items-center">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            </div>

            {/* Time Display */}
            <div className="text-[11px] sm:text-xs font-semibold text-white/80 select-none ml-1">
              {isLive ? (
                <span className="text-red-400 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> LIVE STREAM
                </span>
              ) : (
                <span>
                  {formatTime(currentTime)} <span className="text-white/40">/</span> {formatTime(duration)}
                </span>
              )}
            </div>
          </div>

          {/* Right Controls: Picture in Picture, Settings & Fullscreen */}
          <div className="flex items-center gap-2">
            {/* Picture in Picture Button */}
            {!youtubeId && typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && (
              <button
                onClick={togglePip}
                className={`p-2 rounded-lg transition-colors cursor-pointer border-none ${
                  isPip ? 'bg-primary text-white shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/10 bg-transparent'
                }`}
                title={isPip ? 'Exit Picture-in-Picture' : 'Picture-in-Picture'}
              >
                <PictureInPicture2 size={18} />
              </button>
            )}

            {/* Settings Toggle */}
            <button
              onClick={() => {
                setShowSettingsMenu(prev => !prev);
                setSettingsTab('main');
              }}
              className={`p-2 rounded-lg transition-colors cursor-pointer border-none ${
                showSettingsMenu ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white hover:bg-white/10 bg-transparent'
              }`}
              title="Settings (Speed / Quality)"
            >
              <Settings size={18} />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
