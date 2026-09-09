import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Maximize, Pause, Play, SkipForward, Volume2, VolumeX } from "lucide-react";
import FlixPaywall from "@/components/flix/FlixPaywall";
import { fetchLiveTitles, fetchMySubscription, fetchTitle, flixImage, formatClock, saveProgress, type FlixTitle } from "@/lib/flix";
import { useAppContext } from "@/contexts/AppContext";

const GUEST_LIMIT_SECONDS = 30;

const FlixWatch: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAppContext();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState<FlixTitle | null>(null);
  const [all, setAll] = useState<FlixTitle[]>([]);
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hideTimer = useRef<number>();

  useEffect(() => {
    if (!id) return;
    Promise.all([fetchTitle(id), fetchLiveTitles()]).then(([t, a]) => {
      setTitle(t);
      setAll(a);
    });
  }, [id]);

  useEffect(() => {
    if (!user) {
      setSubscribed(false);
      return;
    }
    fetchMySubscription(user.id).then((s) => setSubscribed(!!s));
  }, [user]);

  const next = all.find((t) => t.id !== id && t.is_original) || all.find((t) => t.id !== id);

  const persist = useCallback(() => {
    if (user?.id && id && duration > 0) saveProgress(user.id, id, Math.floor(time), Math.floor(duration));
  }, [user?.id, id, time, duration]);

  useEffect(() => {
    const i = setInterval(persist, 10000);
    return () => {
      clearInterval(i);
      persist();
    };
  }, [persist]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const poke = () => {
    setShowControls(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setShowControls(false), 3000);
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
      persist();
    }
  };

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setTime(v.currentTime);
    // Guests get a 30-second preview only
    if (subscribed === false && v.currentTime >= GUEST_LIMIT_SECONDS) {
      v.pause();
      setPlaying(false);
      setShowPaywall(true);
    }
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const limit = subscribed === false ? Math.min(GUEST_LIMIT_SECONDS, duration) : duration;
    v.currentTime = Math.min(Number(e.target.value), limit);
    setTime(v.currentTime);
  };

  const fullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current?.requestFullscreen?.();
  };

  if (!title || subscribed === null) {
    return <div className="min-h-screen bg-[#0B0B0D] flex items-center justify-center"><div className="w-16 h-16 border-4 border-[#2A2A2A] border-t-[#FF4D1A] rounded-full animate-spin" /></div>;
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-black text-white flex flex-col"
      onMouseMove={poke}
      onTouchStart={poke}
    >
      <div className={`flex items-center gap-3 px-4 py-3 bg-gradient-to-b from-black/90 to-transparent transition-opacity ${showControls || !playing ? "opacity-100" : "opacity-0"}`}>
        <button onClick={() => { persist(); navigate(`/flix/title/${title.id}`); }} className="flex items-center gap-2 text-[#A1A1A1] hover:text-white font-semibold text-sm" aria-label="Back to title">
          <ArrowLeft size={18} /> {title.name}
        </button>
        <span className="ml-auto text-xs text-[#A1A1A1]">{title.rating} · {title.year}</span>
      </div>

      <div className="flex-1 flex items-center justify-center relative">
        <video
          ref={videoRef}
          key={title.id}
          src={title.video_url}
          poster={flixImage(title, "backdrop")}
          playsInline
          autoPlay
          onClick={togglePlay}
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onEnded={() => { setPlaying(false); persist(); }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          className="max-h-[80vh] w-full object-contain"
        />
        {subscribed === false && (
          <span className="absolute top-4 right-4 bg-black/70 text-xs font-bold px-3 py-1.5 rounded-full">
            Preview {formatClock(Math.max(0, GUEST_LIMIT_SECONDS - time))}
          </span>
        )}
      </div>

      <div className={`px-4 pb-6 pt-2 bg-gradient-to-t from-black/90 to-transparent transition-opacity ${showControls || !playing ? "opacity-100" : "opacity-0"}`}>
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={time}
          onChange={seek}
          aria-label="Seek"
          className="w-full accent-[#FF4D1A] h-1"
        />
        <div className="flex items-center gap-4 mt-2">
          <button onClick={togglePlay} className="p-2 hover:text-[#FF4D1A]" aria-label={playing ? "Pause" : "Play"}>
            {playing ? <Pause size={22} /> : <Play size={22} className="fill-current" />}
          </button>
          <button onClick={() => { const v = videoRef.current; if (v) { v.muted = !v.muted; setMuted(v.muted); } }} className="p-2 hover:text-[#FF4D1A]" aria-label={muted ? "Unmute" : "Mute"}>
            {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <span className="text-xs text-[#A1A1A1]">{formatClock(time)} / {formatClock(duration)}</span>
          <div className="ml-auto flex items-center gap-3">
            {next && (
              <button onClick={() => { persist(); navigate(`/flix/watch/${next.id}`); }} className="flex items-center gap-2 text-sm font-semibold text-[#A1A1A1] hover:text-white" aria-label="Up next">
                Up Next: {next.name} <SkipForward size={16} />
              </button>
            )}
            <button onClick={fullscreen} className="p-2 hover:text-[#FF4D1A]" aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
              <Maximize size={20} />
            </button>
          </div>
        </div>
      </div>
      {showPaywall && <FlixPaywall titleName={title.name} onClose={() => setShowPaywall(false)} />}
    </div>
  );
};

export default FlixWatch;
