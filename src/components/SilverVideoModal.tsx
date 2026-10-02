import React, { useEffect, useRef, useState } from "react";
import { X, Volume2, VolumeX, RotateCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Props {
  userId: string;
  username: string;
  fallbackPhoto?: string;
  onClose: () => void;
}

/** Plays the member's latest Silver video. Only volume control; replay when finished. */
const SilverVideoModal: React.FC<Props> = ({ userId, username, fallbackPhoto, onClose }) => {
  const [url, setUrl] = useState<string | null | undefined>(undefined);
  const [muted, setMuted] = useState(false);
  const [ended, setEnded] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    supabase
      .from("user_media")
      .select("media_url")
      .eq("user_id", userId)
      .eq("content_tier", "silver")
      .eq("media_type", "video")
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => setUrl(data?.[0]?.media_url || null));
  }, [userId]);

  useEffect(() => {
    const v = ref.current;
    if (!v || !url) return;
    v.muted = false;
    v.volume = 1;
    v.play().catch(() => {
      // Browser refused sound autoplay: play muted so it still starts.
      v.muted = true;
      setMuted(true);
      v.play().catch(() => {});
    });
  }, [url]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const replay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = ref.current;
    if (!v) return;
    v.currentTime = 0;
    setEnded(false);
    v.play().catch(() => {});
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      <div
        className="relative aspect-[9/16] h-[min(90vh,calc((100vw-2rem)*16/9))] max-w-full overflow-hidden rounded-xl bg-black"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-2 text-white">
          <X className="h-5 w-5" />
        </button>
        <p className="absolute left-3 top-4 z-10 font-bold text-white drop-shadow">@{username}</p>
        {url === undefined && <div className="flex h-full items-center justify-center text-white/70">Loading…</div>}
        {url === null && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-white/80">
            {fallbackPhoto && <img src={fallbackPhoto} alt={username} className="h-full w-full object-contain" />}
            <p className="absolute bottom-6 rounded-full bg-black/60 px-4 py-2 text-sm">No Silver video yet</p>
          </div>
        )}
        {url && (
          <>
            <video
              ref={ref}
              key={url}
              src={url}
              playsInline
              autoPlay
              controls={false}
              disablePictureInPicture
              controlsList="nodownload nofullscreen noremoteplayback"
              onContextMenu={(e) => e.preventDefault()}
              onEnded={() => setEnded(true)}
              className="h-full w-full object-contain"
            />
            <button
              onClick={toggleMute}
              aria-label={muted ? "Unmute" : "Mute"}
              className="absolute bottom-3 left-3 z-10 rounded-full bg-black/60 p-3 text-white"
            >
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            {ended && (
              <button
                onClick={replay}
                className="absolute inset-0 m-auto flex h-16 w-40 items-center justify-center gap-2 rounded-full bg-black/70 font-semibold text-white"
              >
                <RotateCcw className="h-5 w-5" /> Replay
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SilverVideoModal;
