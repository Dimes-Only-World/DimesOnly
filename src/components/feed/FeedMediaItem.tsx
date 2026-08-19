import { useEffect, useState } from "react";
import { getSignedFeedUrl, FeedMediaRow } from "@/lib/feedApi";
import { Play } from "lucide-react";

export default function FeedMediaItem({ media }: { media: FeedMediaRow }) {
  const [url, setUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSignedFeedUrl(media.storage_bucket, media.storage_path).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [media.storage_bucket, media.storage_path]);

  if (!url) {
    return <div className="w-full aspect-square bg-muted animate-pulse" />;
  }

  if (media.media_type === "video") {
    return (
      <div className="relative w-full bg-black" style={{ aspectRatio: "9 / 16", maxHeight: 640 }}>
        import { useEffect, useState } from "react";
import { getSignedFeedUrl, FeedMediaRow } from "@/lib/feedApi";
import { Play } from "lucide-react";

export default function FeedMediaItem({ media }: { media: FeedMediaRow }) {
  const [url, setUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSignedFeedUrl(media.storage_bucket, media.storage_path).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [media.storage_bucket, media.storage_path]);

  if (!url) {
    return <div className="w-full aspect-square bg-muted animate-pulse" />;
  }

  if (media.media_type === "video") {
    return (
      <div className="relative w-full bg-black" style={{ aspectRatio: "9 / 16", maxHeight: 640 }}>
        <video
          src={url}
          className="w-full h-full object-contain"
          controls={playing}
          muted={!playing}
          autoPlay={playing}
          playsInline
          loop
          onClick={() => setPlaying(true)}
        / controlsList="nodownload" disablePictureInPicture disableRemotePlayback>
        {!playing && (
          <button
            onClick={() => setPlaying(true)}
            className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition"
            aria-label="Play video"
          >
            <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
              <Play className="w-8 h-8 text-black ml-1" fill="black" />
            </div>
          </button>
        )}
      </div>
    );
  }

  return <img src={url} alt="" className="w-full object-cover max-h-[640px]" loading="lazy" />;
}

        {!playing && (
          <button
            onClick={() => setPlaying(true)}
            className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition"
            aria-label="Play video"
          >
            <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
              <Play className="w-8 h-8 text-black ml-1" fill="black" />
            </div>
          </button>
        )}
      </div>
    );
  }

  return <img src={url} alt="" className="w-full object-cover max-h-[640px]" loading="lazy" />;
}
