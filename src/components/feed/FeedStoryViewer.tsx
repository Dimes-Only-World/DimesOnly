import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Volume2, VolumeX, Pause, Play, MoreHorizontal } from "lucide-react";
import { getSignedFeedUrl, FeedMediaRow, FeedPostRow } from "@/lib/feedApi";

export interface StoryItem {
  post: FeedPostRow;
  media: FeedMediaRow;
  author?: { id: string; username: string; profile_photo: string | null };
}

interface Props {
  items: StoryItem[];
  startIndex: number | null;
  onClose: () => void;
}

const PHOTO_DURATION = 5000;

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function FeedStoryViewer({ items, startIndex, onClose }: Props) {
  const open = startIndex !== null;
  const [index, setIndex] = useState(startIndex ?? 0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number>();
  const startedRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);

  useEffect(() => {
    if (startIndex !== null) {
      setIndex(startIndex);
      setPaused(false);
    }
  }, [startIndex]);

  const current = items[index];

  const loadUrl = useCallback(
    async (item?: StoryItem) => {
      if (!item) return;
      const key = item.media.id;
      if (urls[key]) return;
      const u = await getSignedFeedUrl(item.media.storage_bucket, item.media.storage_path);
      if (u) setUrls((prev) => ({ ...prev, [key]: u }));
    },
    [urls]
  );

  useEffect(() => {
    if (!open) return;
    loadUrl(items[index]);
    loadUrl(items[index + 1]);
    loadUrl(items[index - 1]);
  }, [open, index, items, loadUrl]);

  const goNext = useCallback(() => {
    setIndex((i) => {
      if (i >= items.length - 1) {
        onClose();
        return i;
      }
      return i + 1;
    });
  }, [items.length, onClose]);

  const goPrev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  // reset progress on item change
  useEffect(() => {
    setProgress(0);
    elapsedRef.current = 0;
    startedRef.current = performance.now();
  }, [index]);

  // photo timer / video progress
  useEffect(() => {
    if (!open || !current) return;
    const isVideo = current.media.media_type === "video";
    if (isVideo) return; // handled by timeupdate

    const tick = (t: number) => {
      if (paused) {
        startedRef.current = t;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      elapsedRef.current += t - startedRef.current;
      startedRef.current = t;
      const p = Math.min(1, elapsedRef.current / PHOTO_DURATION);
      setProgress(p);
      if (p >= 1) {
        goNext();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    startedRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [open, index, paused, current, goNext]);

  // pause/play video
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (paused) v.pause();
    else v.play().catch(() => {});
  }, [paused, index, urls]);

  // keyboard + scroll lock
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, goNext, goPrev]);

  const neighbours = useMemo(
    () => ({ prev: items[index - 1], next: items[index + 1] }),
    [items, index]
  );

  if (!open || !current) return null;

  const url = urls[current.media.id];
  const author = current.author;

  const renderPreview = (item?: StoryItem) => {
    if (!item) return <div className="w-full h-full" />;
    const u = urls[item.media.id];
    return (
      <div className="w-full h-full rounded-2xl overflow-hidden bg-white/5">
        {u && item.media.media_type === "photo" ? (
          <img src={u} alt="" className="w-full h-full object-cover blur-sm scale-105 opacity-60" />
        ) : u ? (
          <video src={u} muted playsInline className="w-full h-full object-cover blur-sm scale-105 opacity-60" />
        ) : null}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center select-none">
      {/* Close */}
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 z-30 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="flex items-center justify-center gap-4 w-full px-4">
        {/* prev peek */}
        <div className="hidden lg:block w-[16vw] max-w-[220px] aspect-[9/16]">{renderPreview(neighbours.prev)}</div>

        {/* main card */}
        <div className="relative h-[86vh] aspect-[9/16] max-w-[95vw] bg-neutral-900 rounded-3xl overflow-hidden shadow-2xl">
          {/* progress */}
          <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-3">
            {items.map((it, i) => (
              <div key={it.media.id} className="h-[3px] flex-1 rounded-full bg-white/30 overflow-hidden">
                <div
                  className="h-full bg-white"
                  style={{ width: i < index ? "100%" : i === index ? `${progress * 100}%` : "0%" }}
                />
              </div>
            ))}
          </div>

          {/* header */}
          <div className="absolute top-6 left-0 right-0 z-20 flex items-center gap-2 px-4 pt-2">
            <img
              src={author?.profile_photo || "/placeholder.svg"}
              alt=""
              className="w-9 h-9 rounded-full object-cover border border-white/40"
            />
            <span className="text-white text-sm font-semibold truncate">@{author?.username || "user"}</span>
            <span className="text-white/70 text-xs">{timeAgo(current.post.created_at)}</span>
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => setMuted((m) => !m)}
                aria-label={muted ? "Unmute" : "Mute"}
                className="w-9 h-9 rounded-full hover:bg-white/15 text-white flex items-center justify-center"
              >
                {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? "Play" : "Pause"}
                className="w-9 h-9 rounded-full hover:bg-white/15 text-white flex items-center justify-center"
              >
                {paused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
              </button>
              <button
                aria-label="More"
                className="w-9 h-9 rounded-full hover:bg-white/15 text-white flex items-center justify-center"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* media */}
          {!url ? (
            <div className="w-full h-full bg-white/5 animate-pulse" />
          ) : current.media.media_type === "video" ? (
            <video
              key={current.media.id}
              ref={videoRef}
              className="w-full h-full object-contain bg-black"
              autoPlay
              playsInline
              muted={muted}
              controlsList="nodownload"
              onEnded={goNext}
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                if (v.duration) setProgress(v.currentTime / v.duration);
              }}
            >
              <source src={url} />
            </video>
          ) : (
            <img src={url} alt="" className="w-full h-full object-contain bg-black" />
          )}

          {/* tap zones */}
          <button
            aria-label="Previous"
            onClick={goPrev}
            className="absolute inset-y-0 left-0 w-1/3 z-10 focus:outline-none"
          />
          <button
            aria-label="Next"
            onClick={goNext}
            className="absolute inset-y-0 right-0 w-1/3 z-10 focus:outline-none"
          />

          {/* caption */}
          {current.post.caption && (
            <div className="absolute bottom-0 left-0 right-0 z-20 p-5 pt-16 bg-gradient-to-t from-black/85 to-transparent">
              <p className="text-white text-sm whitespace-pre-wrap line-clamp-4">{current.post.caption}</p>
            </div>
          )}
        </div>

        {/* next peek */}
        <div className="hidden lg:block w-[16vw] max-w-[220px] aspect-[9/16]">{renderPreview(neighbours.next)}</div>
      </div>

      {/* arrows */}
      <button
        onClick={goPrev}
        disabled={index === 0}
        aria-label="Previous item"
        className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 disabled:opacity-30 text-white flex items-center justify-center transition"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={goNext}
        aria-label="Next item"
        className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
}
