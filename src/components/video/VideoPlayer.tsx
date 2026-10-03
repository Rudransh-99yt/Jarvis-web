import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Loader2,
  FileText,
  Clock,
  Settings
} from 'lucide-react';
import type { VideoRecord } from '../../types/video.ts';

interface VideoPlayerProps {
  video: VideoRecord;
  streamUrl: string;
  onTimeUpdate?: (currentTime: number) => void;
  className?: string;
  autoPlay?: boolean;
  seekToSeconds?: number | null;
  onSeekComplete?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  streamUrl,
  onTimeUpdate,
  className = '',
  autoPlay = false,
  seekToSeconds,
  onSeekComplete
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrubberRef = useRef<HTMLDivElement | null>(null);

  // Player state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(video.durationSeconds || 0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [areControlsVisible, setAreControlsVisible] = useState<boolean>(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState<boolean>(false);
  const [showTranscriptDrawer, setShowTranscriptDrawer] = useState<boolean>(false);

  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (secs: number): string => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleMouseMove = () => {
    setAreControlsVisible(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (isPlaying) setAreControlsVisible(false);
    }, 3000);
  };

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch((err) => {
        console.warn('[VideoPlayer] Play interrupted:', err);
      });
    }
  }, [isPlaying]);

  const toggleMute = () => {
    if (!videoRef.current) return;
    const next = !isMuted;
    videoRef.current.muted = next;
    setIsMuted(next);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const handleSpeedSelect = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSpeedMenu(false);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch((err) => {
        console.warn('Fullscreen request denied:', err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current || !videoRef.current || !duration) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const target = pos * duration;
    videoRef.current.currentTime = target;
    setCurrentTime(target);
  };

  const seekRelative = (seconds: number) => {
    if (!videoRef.current) return;
    const target = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = target;
    setCurrentTime(target);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        seekRelative(-5);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        seekRelative(5);
      } else if (e.key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm') {
        e.preventDefault();
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Programmatic seek trigger from AI citations / discovery
  useEffect(() => {
    if (seekToSeconds !== undefined && seekToSeconds !== null && videoRef.current) {
      const targetSec = Math.max(0, Math.min(duration || 99999, seekToSeconds));
      videoRef.current.currentTime = targetSec;
      setCurrentTime(targetSec);
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      onSeekComplete?.();
    }
  }, [seekToSeconds, duration, onSeekComplete]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Processing or Unavailable placeholder
  if (video.status === 'processing' || video.status === 'uploading') {
    return (
      <div className={`w-full max-w-full aspect-video rounded-xl bg-slate-950 border border-cyan-500/30 flex flex-col items-center justify-center p-6 text-center space-y-4 ${className}`}>
        <div className="relative">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
          <div className="absolute inset-0 bg-cyan-500/20 blur-md rounded-full -z-10" />
        </div>
        <div className="space-y-1 max-w-sm">
          <h3 className="text-sm font-bold text-cyan-200 tracking-wider font-mono uppercase">
            MEDIA STREAM {video.status === 'uploading' ? 'UPLOADING' : 'PROCESSING'}
          </h3>
          <p className="text-xs text-cyan-400/60 font-sans">
            Video '{video.title}' is being encoded and indexed for secure classroom streaming.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setAreControlsVisible(false)}
      className={`group relative w-full max-w-full aspect-video rounded-xl bg-black border border-cyan-500/30 overflow-hidden shadow-2xl flex items-center justify-center select-none ${className}`}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={streamUrl}
        autoPlay={autoPlay}
        playsInline
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={() => {
          if (videoRef.current) {
            const cur = videoRef.current.currentTime;
            setCurrentTime(cur);
            onTimeUpdate?.(cur);
          }
        }}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration || video.durationSeconds || 0);
          }
        }}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onError={() => {
          setHasError(true);
          setErrorMessage('Error loading media stream from secure storage provider.');
          setIsBuffering(false);
        }}
        onClick={togglePlay}
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* Buffering Spinner Overlay */}
      {isBuffering && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black/40 backdrop-blur-xs z-20">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin drop-shadow-[0_0_10px_#06b6d4]" />
        </div>
      )}

      {/* Error Overlay */}
      {hasError && (
        <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-center p-6 space-y-3 z-30">
          <AlertTriangle className="w-10 h-10 text-amber-400" />
          <h4 className="text-sm font-bold text-white font-mono uppercase">STREAM PLAYBACK FAILURE</h4>
          <p className="text-xs text-amber-200/70 max-w-md">{errorMessage}</p>
          <button
            onClick={() => {
              setHasError(false);
              videoRef.current?.load();
            }}
            className="px-4 py-1.5 rounded-lg border border-amber-500/40 bg-amber-950/40 text-xs font-mono text-amber-300 hover:bg-amber-500/20"
          >
            Retry Playback
          </button>
        </div>
      )}

      {/* Top Overlay: Title & Course Badge */}
      <div
        className={`absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between pointer-events-none transition-opacity duration-300 z-20 ${
          areControlsVisible || !isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 pr-4">
          <span className="shrink-0 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 font-mono font-bold text-[10px] tracking-wider">
            {video.classId}
          </span>
          <h2 className="text-xs sm:text-sm font-bold text-white tracking-wide truncate">
            {video.title}
          </h2>
        </div>

        {video.transcript && (
          <button
            onClick={() => setShowTranscriptDrawer(!showTranscriptDrawer)}
            className="pointer-events-auto px-2.5 py-1 rounded bg-black/60 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-300 text-[11px] font-mono flex items-center gap-1.5 shrink-0 transition-all"
            title="Toggle Transcript Drawer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Transcript</span>
          </button>
        )}
      </div>

      {/* Center Big Play Button (when paused) */}
      {!isPlaying && !isBuffering && !hasError && (
        <button
          onClick={togglePlay}
          className="absolute inset-auto p-4 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/60 text-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.4)] backdrop-blur-md transition-all transform hover:scale-110 z-20"
        >
          <Play className="w-8 h-8 fill-cyan-300 text-cyan-300 ml-1" />
        </button>
      )}

      {/* Bottom Control Bar */}
      <div
        className={`absolute bottom-0 inset-x-0 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent space-y-2 transition-opacity duration-300 z-20 ${
          areControlsVisible || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Scrubber Progress Bar */}
        <div
          ref={scrubberRef}
          onClick={handleScrubberClick}
          className="relative h-2 w-full bg-slate-800/80 hover:h-2.5 rounded-full cursor-pointer transition-all overflow-hidden"
        >
          {/* Progress fill */}
          <div
            style={{ width: `${progressPercent}%` }}
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full relative"
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_8px_#00f2fe]" />
          </div>
        </div>

        {/* Action Controls Row */}
        <div className="flex items-center justify-between text-xs font-mono text-cyan-200 gap-2">
          {/* Left Controls: Play, Skip, Volume, Time */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={togglePlay}
              className="p-1.5 rounded hover:bg-cyan-500/20 text-cyan-300 transition-colors"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-cyan-300" />}
            </button>

            <button
              onClick={() => seekRelative(-10)}
              className="p-1 rounded hover:bg-cyan-500/20 text-cyan-400/80 hover:text-cyan-200 hidden sm:block"
              title="Rewind 10s (Left Arrow)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-1.5 group/vol">
              <button
                onClick={toggleMute}
                className="p-1 rounded hover:bg-cyan-500/20 text-cyan-300"
                title={isMuted ? 'Unmute (m)' : 'Mute (m)'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-slate-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-cyan-300" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-14 sm:w-20 h-1 bg-slate-700 accent-cyan-400 rounded-lg cursor-pointer"
              />
            </div>

            {/* Time Display */}
            <div className="text-[11px] text-cyan-400/80 tracking-wider">
              <span className="text-white font-bold">{formatTime(currentTime)}</span>
              <span className="text-cyan-500/50 mx-1">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls: Speed Menu, Fullscreen */}
          <div className="flex items-center gap-2 relative">
            {/* Speed Selector */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="px-2 py-1 rounded bg-black/40 border border-cyan-500/30 hover:bg-cyan-500/20 text-[11px] font-bold text-cyan-300 transition-colors"
                title="Playback Rate"
              >
                {playbackSpeed}x
              </button>

              {showSpeedMenu && (
                <div className="absolute right-0 bottom-full mb-2 bg-slate-950/95 border border-cyan-500/40 rounded-lg p-1.5 shadow-2xl space-y-1 z-50 text-[11px]">
                  {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => handleSpeedSelect(spd)}
                      className={`w-full px-3 py-1 rounded text-left transition-colors ${
                        playbackSpeed === spd
                          ? 'bg-cyan-500/30 text-cyan-200 font-bold'
                          : 'text-cyan-400/80 hover:bg-white/5'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded hover:bg-cyan-500/20 text-cyan-300 transition-colors"
              title={isFullscreen ? 'Exit Fullscreen (f)' : 'Fullscreen (f)'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Transcript Drawer Overlay */}
      {showTranscriptDrawer && video.transcript && (
        <div className="absolute top-12 bottom-16 right-4 w-88 max-w-[90%] bg-slate-950/95 border border-cyan-500/40 rounded-xl p-4 shadow-2xl backdrop-blur-md flex flex-col z-30 animate-fade-in">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2 mb-3">
            <span className="text-xs font-bold text-cyan-200 font-mono uppercase flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              LECTURE TRANSCRIPT & TIMESTAMPS
            </span>
            <button
              onClick={() => setShowTranscriptDrawer(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 text-xs text-cyan-100/90 leading-relaxed font-sans space-y-3">
            {video.segments && video.segments.length > 0 ? (
              video.segments.map((seg) => {
                const isActive = currentTime >= seg.startSeconds && currentTime <= seg.endSeconds;
                return (
                  <div
                    key={seg.id}
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = seg.startSeconds;
                        setCurrentTime(seg.startSeconds);
                        videoRef.current.play().catch(() => {});
                        setIsPlaying(true);
                      }
                    }}
                    className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-cyan-500/20 border-cyan-400/60 text-white'
                        : 'bg-black/40 border-cyan-500/20 hover:border-cyan-400/40 text-cyan-200/80'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 font-mono text-[10px] font-bold">
                        {seg.timestampLabel || formatTime(seg.startSeconds)}
                      </span>
                      {isActive && (
                        <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          Playing
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed">{seg.text}</p>
                  </div>
                );
              })
            ) : (
              <p>{video.transcript}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
