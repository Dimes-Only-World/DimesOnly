import React, { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface BannerVideoProps {
  src: string;
  loop?: boolean;
  className?: string;
  overlay?: boolean;
  /** If true, render as absolute-positioned background video (no controls) */
  background?: boolean;
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
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
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
    const onPlay = () => setIsPlaying(true);
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
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

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
      el.requestFullscreen?.();
    }
  }, []);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Background mode: no controls, just the video
  if (background) {
    return (
      import React, { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface BannerVideoProps {
  src: string;
  loop?: boolean;
  className?: string;
  overlay?: boolean;
  /** If true, render as absolute-positioned background video (no controls) */
  background?: boolean;
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
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
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
    const onPlay = () => setIsPlaying(true);
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
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

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
      el.requestFullscreen?.();
    }
  }, []);

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
       controlsList="nodownload" disableRemotePlayback>
        <source src={src} type={src.endsWith(".webm") ? "video/webm" : "video/mp4"} />
      </video>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden bg-black aspect-video ${className}`}
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
      onClick={togglePlayPause}
    >
      <video
        ref={videoRef}
        key={src}
        playsInline
        loop={loop}
        preload="metadata"
        className="w-full h-full object-contain"
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
          showControls ? "opacity-100" : "opacity-0"
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
            <button
              onClick={togglePlayPause}
              className="text-white hover:text-white/80 transition-colors p-1"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-white" />
              ) : (
                <Play className="w-5 h-5 fill-white" />
              )}
            </button>

            {/* Volume/Mute */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleMute();
              }}
              className="text-white hover:text-white/80 transition-colors p-1"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>

            {/* Time */}
            <span className="text-white text-xs font-mono select-none">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="flex-1" />

            {/* Fullscreen */}
            <button
              onClick={handleFullscreen}
              className="text-white hover:text-white/80 transition-colors p-1"
              aria-label="Fullscreen"
            >
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BannerVideo;

        <source src={src} type={src.endsWith(".webm") ? "video/webm" : "video/mp4"} />
      </video>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden bg-black aspect-video ${className}`}
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
      onClick={togglePlayPause}
    >
      import React, { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface BannerVideoProps {
  src: string;
  loop?: boolean;
  className?: string;
  overlay?: boolean;
  /** If true, render as absolute-positioned background video (no controls) */
  background?: boolean;
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
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
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
    const onPlay = () => setIsPlaying(true);
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
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

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
      el.requestFullscreen?.();
    }
  }, []);

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

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden bg-black aspect-video ${className}`}
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
      onClick={togglePlayPause}
    >
      <video
        ref={videoRef}
        key={src}
        playsInline
        loop={loop}
        preload="metadata"
        className="w-full h-full object-contain"
       controlsList="nodownload" disablePictureInPicture disableRemotePlayback>
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
          showControls ? "opacity-100" : "opacity-0"
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
            <button
              onClick={togglePlayPause}
              className="text-white hover:text-white/80 transition-colors p-1"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-white" />
              ) : (
                <Play className="w-5 h-5 fill-white" />
              )}
            </button>

            {/* Volume/Mute */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleMute();
              }}
              className="text-white hover:text-white/80 transition-colors p-1"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>

            {/* Time */}
            <span className="text-white text-xs font-mono select-none">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="flex-1" />

            {/* Fullscreen */}
            <button
              onClick={handleFullscreen}
              className="text-white hover:text-white/80 transition-colors p-1"
              aria-label="Fullscreen"
            >
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BannerVideo;

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
          showControls ? "opacity-100" : "opacity-0"
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
            <button
              onClick={togglePlayPause}
              className="text-white hover:text-white/80 transition-colors p-1"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-white" />
              ) : (
                <Play className="w-5 h-5 fill-white" />
              )}
            </button>

            {/* Volume/Mute */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleMute();
              }}
              className="text-white hover:text-white/80 transition-colors p-1"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>

            {/* Time */}
            <span className="text-white text-xs font-mono select-none">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="flex-1" />

            {/* Fullscreen */}
            <button
              onClick={handleFullscreen}
              className="text-white hover:text-white/80 transition-colors p-1"
              aria-label="Fullscreen"
            >
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BannerVideo;
