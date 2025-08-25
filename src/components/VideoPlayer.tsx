import React, { useRef, useState } from 'react';
import { Heart } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title: string;
  onLike: () => void;
  likes: number;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, poster, title, onLike, likes }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [showOrientationHint, setShowOrientationHint] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [detectedOrientation, setDetectedOrientation] = useState<"portrait" | "landscape" | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const playVideoWithDetectedOrientation = async () => {
    const video = videoRef.current;
    if (!video) return;

    // Detect aspect ratio from metadata
    try {
      const vw = (video as HTMLVideoElement).videoWidth;
      const vh = (video as HTMLVideoElement).videoHeight;
      if (vw && vh) {
        setDetectedOrientation(vw >= vh ? 'landscape' : 'portrait');
      }
    } catch {}

    // Try fullscreen first
    try {
      if (video.requestFullscreen) {
        await video.requestFullscreen();
      }
      // @ts-ignore - iOS Safari specific
      else if (video.webkitEnterFullscreen) {
        // @ts-ignore
        video.webkitEnterFullscreen();
      }
    } catch {}

    // Try to lock orientation to the video's aspect (not supported on iOS Safari)
    try {
      // Only works while in fullscreen on most browsers
      // Some environments throw if not allowed
      if (screen.orientation && screen.orientation.lock) {
        const target = detectedOrientation || 'landscape';
        await screen.orientation.lock(target === 'landscape' ? 'landscape' : 'portrait');
      } else {
        setShowOrientationHint(true);
      }
    } catch {
      setShowOrientationHint(true);
    }

    // Ensure playback starts after fullscreen/orientation attempts
    try {
      await video.play();
      setIsPlaying(true);
    } catch {}
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    onLike();
  };

  return (
    <div className="mb-8">
      <h3 className="text-xl font-bold text-yellow-400 mb-4">{title}</h3>
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          controls
          poster={poster}
          className={`w-full h-64 ${isPlaying ? 'object-contain bg-black' : 'object-cover'}`}
          onLoadedMetadata={(e) => {
            const el = e.currentTarget as HTMLVideoElement;
            const vw = el.videoWidth;
            const vh = el.videoHeight;
            setDetectedOrientation(vw && vh ? (vw >= vh ? 'landscape' : 'portrait') : null);
          }}
          onPlay={playVideoWithDetectedOrientation}
          onClick={playVideoWithDetectedOrientation}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        >
          <source src={src} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        {showOrientationHint && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-16 bg-black/70 text-white text-xs px-3 py-1 rounded-md">
            For the best view, rotate your device to <b>{detectedOrientation === 'portrait' ? 'Portrait' : 'Landscape'}</b> or use the 3-dot menu to switch.
          </div>
        )}
        <div className="absolute bottom-4 right-4 flex items-center gap-2">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 px-3 py-1 rounded-full transition-colors ${
              isLiked ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <Heart size={16} className={isLiked ? 'fill-current' : ''} />
            {likes}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;