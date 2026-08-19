import React, { useRef, useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play, X } from "lucide-react";

interface VideoPlayerModalProps {
  videoUrl: string;
  isOpen: boolean;
  onClose: () => void;
  thumbnail?: string;
}

const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  videoUrl,
  isOpen,
  onClose,
  thumbnail,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(console.error);
    }
  }, [isOpen, videoUrl]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-black border-none">
        <div className="relative w-full flex items-center justify-center">
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 rounded-full"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Video Player */}
          <video
            key={videoUrl}
            ref={videoRef}
            src={videoUrl}
            className="max-w-full max-h-[85vh] object-contain"
            controls
            autoPlay
            playsInline
            poster={thumbnail}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Video Thumbnail with Play Button
interface VideoThumbnailProps {
  videoUrl: string;
  thumbnail?: string;
  className?: string;
  onClick: () => void;
}

export const VideoThumbnail: React.FC<VideoThumbnailProps> = ({
  videoUrl,
  thumbnail,
  className = "",
  onClick,
}) => {
  const [thumbnailSrc, setThumbnailSrc] = useState<string>(thumbnail || "");
  const videoRef = useRef<HTMLVideoElement>(null);

  // Generate thumbnail from video if not provided
  useEffect(() => {
    if (thumbnail) {
      setThumbnailSrc(thumbnail);
      return;
    }

    const video = document.createElement("video");
    video.src = videoUrl;
    video.crossOrigin = "anonymous";
    video.currentTime = 1;
    video.muted = true;

    video.onloadeddata = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        setThumbnailSrc(canvas.toDataURL("image/jpeg"));
      }
    };

    video.load();
  }, [videoUrl, thumbnail]);

  return (
    <div
      className={`relative cursor-pointer group ${className}`}
      onClick={onClick}
    >
      {/* Thumbnail or Video Preview */}
      {thumbnailSrc ? (
        <img
          src={thumbnailSrc}
          alt="Video thumbnail"
          className="w-full h-full object-cover rounded-lg"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "/placeholder.svg";
          }}
        />
      ) : (
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-cover rounded-lg"
          muted
          preload="metadata"
        />
      )}

      {/* Play Button Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors rounded-lg">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
          <Play className="h-8 w-8 md:h-10 md:w-10 text-black fill-black ml-1" />
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerModal;
