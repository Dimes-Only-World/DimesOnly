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
  const [showLandscapeHint, setShowLandscapeHint] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const playVideoInLandscape = async () => {
    const video = videoRef.current;
    if (!video) return;

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

    // Try to lock orientation to landscape (not supported on iOS Safari)
    try {
      // Only works while in fullscreen on most browsers
      // Some environments throw if not allowed
      if (screen.orientation && screen.orientation.lock) {
        await screen.orientation.lock('landscape');
      } else {
        setShowLandscapeHint(true);
      }
    } catch {
      setShowLandscapeHint(true);
    }
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
          className="w-full h-64 object-cover"
          onPlay={playVideoInLandscape}
          onClick={playVideoInLandscape}
        >
          <source src={src} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        {showLandscapeHint && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-16 bg-black/70 text-white text-xs px-3 py-1 rounded-md">
            For the best view, rotate your device or use the 3-dot menu to switch to <b>Landscape</b>.
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