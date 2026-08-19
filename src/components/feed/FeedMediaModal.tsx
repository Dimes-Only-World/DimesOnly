import { useEffect } from "react";
import { X } from "lucide-react";

interface Props {
  url: string | null;
  mediaType: "photo" | "video" | null;
  onClose: () => void;
}

export default function FeedMediaModal({ url, mediaType, onClose }: Props) {
  useEffect(() => {
    if (!url) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [url, onClose]);

  if (!url) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
      >
        <X className="w-6 h-6" />
      </button>

      <div
        className="relative max-w-[95vw] max-h-[92vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {mediaType === "video" ? (
          import { useEffect } from "react";
import { X } from "lucide-react";

interface Props {
  url: string | null;
  mediaType: "photo" | "video" | null;
  onClose: () => void;
}

export default function FeedMediaModal({ url, mediaType, onClose }: Props) {
  useEffect(() => {
    if (!url) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [url, onClose]);

  if (!url) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
      >
        <X className="w-6 h-6" />
      </button>

      <div
        className="relative max-w-[95vw] max-h-[92vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {mediaType === "video" ? (
          <video
            src={url}
            className="max-w-[95vw] max-h-[92vh] object-contain rounded-lg shadow-2xl"
            controls
            controlsList="nodownload"
            autoPlay
            playsInline
          / disablePictureInPicture disableRemotePlayback>
        ) : (
          <img
            src={url}
            alt=""
            className="max-w-[95vw] max-h-[92vh] object-contain rounded-lg shadow-2xl"
          />
        )}
      </div>
    </div>
  );
}

        ) : (
          <img
            src={url}
            alt=""
            className="max-w-[95vw] max-h-[92vh] object-contain rounded-lg shadow-2xl"
          />
        )}
      </div>
    </div>
  );
}
