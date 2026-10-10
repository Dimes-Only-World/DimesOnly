import React, { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, MoreVertical } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BannerVideoProps {
  src: string;
  loop?: boolean;
  className?: string;
  overlay?: boolean;
  /** If true, render as absolute-positioned background video (no controls) */
  background?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  onEnded?: () => void;
  videoRef?: React.RefObject<HTMLVideoElement>;
  /** No seek bar/controls: tap to pause/resume, replay button when finished */
  minimal?: boolean;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const BannerVideo: React.FC<BannerVideoProps> = ({
  src,
  loop = true,
  className = "",
  overlay = true,
  background = false,
  autoPlay = false,
  muted = false,
  onEnded,
  videoRef: externalVideoRef,
  minimal = false,
}) => {
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalVideoRef || internalVideoRef;
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(muted);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(autoPlay);
  const [isSeeking, setIsSeeking] = useState(false);

  // No autoplay — video starts paused, user must click play

  // Time updates
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTime = () => {
      if (!isSeeking) setCurrentTime(video.currentTime);
    };
    const onMeta = () => setDuration(video.duration);
    const onPlay = () => {
      setIsPlaying(true);
      setHasStarted(true);
      setShowControls(true);
    };
    const onPause = () => setIsPlaying(false);

    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [isSeeking]);

  // Auto-hide controls after 3s
  const resetHideTimer = useCallback(() => {
    if (!hasStarted) return;
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, [hasStarted]);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [resetHideTimer]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);

    // If video wasn't playing (browser blocked autoplay), start it now
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, []);

  const togglePlayPause = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleSeek = useCallback((value: number[]) => {
    const video = videoRef.current;
    if (!video || !isFinite(duration)) return;
    const time = (value[0] / 100) * duration;
    video.currentTime = time;
    setCurrentTime(time);
  }, [duration]);

  const handleFullscreen = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      const video = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
      if (el.requestFullscreen) el.requestFullscreen();
      else video?.webkitEnterFullscreen?.();
    }
  }, [videoRef]);

  const setPlaybackRate = useCallback((rate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    resetHideTimer();
  }, [resetHideTimer, videoRef]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Background mode: no controls, just the video
  if (background) {
    return (
      <video
        ref={videoRef}
        key={src}
        autoPlay
        muted
        playsInline
        controls={false}
        disablePictureInPicture
        preload="auto"
        {...({ "webkit-playsinline": "true" } as Record<string, string>)}
        loop={loop}
        className={className}
      >
        <source src={src} type={src.endsWith(".webm") ? "video/webm" : "video/mp4"} />
      </video>
    );
  }

  // Minimal mode: plays through to the end. Taps never pause; they only start
  // playback (if the browser blocked autoplay) and restore sound.
  if (minimal) {
    const ended = duration > 0 && currentTime >= duration - 0.25 && !isPlaying;
    const startWithSound = (e?: React.SyntheticEvent) => {
      e?.stopPropagation();
      const v = videoRef.current;
      if (!v) return;
      v.muted = false;
      v.volume = 1;
      setIsMuted(false);
      if (v.paused && !v.ended) v.play().catch(() => {});
    };
    const replay = (e: React.MouseEvent) => {
      e.stopPropagation();
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = 0;
      v.muted = false;
      v.play().catch(() => {});
    };
    return (
      <div
        ref={containerRef}
        className={`relative w-full overflow-hidden bg-card ${/\baspect-/.test(className) ? "" : "aspect-video"} ${className}`}
        onClick={ended ? replay : startWithSound}
      >
        <video
          ref={videoRef}
          key={src}
          data-play-through="true"
          playsInline
          loop={false}
          autoPlay={autoPlay}
          muted={muted}
          controls={false}
          disablePictureInPicture
          controlsList="nodownload noremoteplayback"
          preload="auto"
          onEnded={onEnded}
          onPause={(e) => {
            const v = e.currentTarget;
            if (!v.ended && hasStarted) v.play().catch(() => {});
          }}
          onVolumeChange={(e) => setIsMuted(e.currentTarget.muted)}
          onContextMenu={(e) => e.preventDefault()}
          className="h-full w-full object-cover pointer-events-none"
        >
          <source src={src} type={src.endsWith(".webm") ? "video/webm" : "video/mp4"} />
        </video>
        {!isPlaying && !ended && (
          <div className="absolute inset-0 z-[2] flex items-center justify-center pointer-events-none">
            <div className="bg-black/50 rounded-full p-5">
              <Play className="w-12 h-12 text-white fill-white" />
            </div>
          </div>
        )}
        <div className="absolute bottom-2 right-2 z-[3] flex gap-2">
          {isMuted && isPlaying && (
            <button
              type="button"
              onClick={startWithSound}
              aria-label="Turn sound on"
              className="rounded-full bg-black/60 p-2.5 text-white"
            >
              <VolumeX className="w-5 h-5" />
            </button>
          )}
          <button
            type="button"
            onClick={handleFullscreen}
            aria-label="Full screen"
            className="rounded-full bg-black/60 p-2.5 text-white"
          >
            <Maximize className="w-5 h-5" />
          </button>
        </div>
        {ended && (
          <button
            type="button"
            onClick={replay}
            className="absolute bottom-3 left-3 z-[3] rounded-full bg-black/60 px-4 py-2 text-sm font-semibold text-white hover:bg-black/80"
          >
            ↻ Watch again
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden bg-card ${/\baspect-/.test(className) ? "" : "aspect-video"} ${className}`}
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
      onClick={togglePlayPause}
    >
      <video
        ref={videoRef}
        key={src}
        playsInline
        loop={loop}
        autoPlay={autoPlay}
        muted={muted}
        preload="metadata"
        onEnded={onEnded}
        className="h-full w-full object-cover"
      >
        <source src={src} type={src.endsWith(".webm") ? "video/webm" : "video/mp4"} />
      </video>

      {/* Translucent overlay */}
      {overlay && (
        <div className="absolute inset-0 bg-black/20 pointer-events-none z-[1]" />
      )}

      {/* Center play button */}
      <div
        className={`absolute inset-0 z-[2] flex items-center justify-center pointer-events-none transition-opacity duration-300 ${
          isPlaying ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="bg-black/50 rounded-full p-5">
          <Play className="w-12 h-12 text-white fill-white" />
        </div>
      </div>

      {/* Custom control bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-[3] transition-opacity duration-300 ${
          hasStarted && showControls ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar background gradient */}
        <div className="bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-8 pb-2 px-3">
          {/* Seekbar */}
          <div className="mb-2 px-1">
            <Slider
              value={[progressPercent]}
              max={100}
              step={0.1}
              onValueChange={handleSeek}
              onPointerDown={() => setIsSeeking(true)}
              onPointerUp={() => setIsSeeking(false)}
              className="cursor-pointer [&_[data-radix-slider-track]]:h-1 [&_[data-radix-slider-track]]:bg-white/30 [&_[data-radix-slider-range]]:bg-red-500 [&_[data-radix-slider-thumb]]:h-3 [&_[data-radix-slider-thumb]]:w-3 [&_[data-radix-slider-thumb]]:bg-red-500 [&_[data-radix-slider-thumb]]:border-0"
            />
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={togglePlayPause}
              className="h-9 w-9 text-white hover:bg-white/10 hover:text-white"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-white" />
              ) : (
                <Play className="w-5 h-5 fill-white" />
              )}
            </Button>

            {/* Volume/Mute */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                toggleMute();
              }}
              className="h-9 w-9 text-white hover:bg-white/10 hover:text-white"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </Button>

            {/* Time */}
            <span className="text-white text-xs font-mono select-none">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="flex-1" />

            {/* Fullscreen */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleFullscreen}
              className="h-9 w-9 text-white hover:bg-white/10 hover:text-white"
              aria-label="Fullscreen"
            >
              <Maximize className="w-5 h-5" />
            </Button>

            <DropdownMenu onOpenChange={(open) => open && resetHideTimer()}>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-white hover:bg-white/10 hover:text-white"
                  aria-label="Video options"
                  onClick={(event) => event.stopPropagation()}
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-36" onClick={(event) => event.stopPropagation()}>
                <DropdownMenuItem onSelect={() => setPlaybackRate(0.75)}>Speed 0.75×</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setPlaybackRate(1)}>Speed 1×</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setPlaybackRate(1.25)}>Speed 1.25×</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setPlaybackRate(1.5)}>Speed 1.5×</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BannerVideo;
