import { useEffect, useState } from "react";
import { getSignedFeedUrl, FeedMediaRow } from "@/lib/feedApi";
import { Play } from "lucide-react";

interface Props {
  media: FeedMediaRow;
  onOpen: (url: string, mediaType: "photo" | "video") => void;
}

export default function FeedGridItem({ media, onOpen }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSignedFeedUrl(media.storage_bucket, media.storage_path).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [media.storage_bucket, media.storage_path]);

  return (
    <button
      type="button"
      onClick={() => url && onOpen(url, media.media_type)}
      className="relative w-full aspect-square overflow-hidden bg-muted group focus:outline-none focus:ring-2 focus:ring-primary rounded-md"
      aria-label={media.media_type === "video" ? "Play video" : "View photo"}
    >
      {!url ? (
        <div className="w-full h-full bg-muted animate-pulse" />
      ) : media.media_type === "video" ? (
        <>
          <video
            src={url}
            className="w-full h-full object-cover"
            muted
            playsInline
            preload="metadata"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/40 transition">
            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
              <Play className="w-6 h-6 text-black ml-0.5" fill="black" />
            </div>
          </div>
        </>
      ) : (
        <img
          src={url}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      )}
    </button>
  );
}
