import React, { useState } from 'react';
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

  const handleLike = () => {
    setIsLiked(!isLiked);
    onLike();
  };

  return (
    <div className="mb-8">
      <h3 className="text-xl font-bold text-yellow-400 mb-4">{title}</h3>
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          controls
          poster={poster}
          className="w-full h-64 object-cover"
        >
          <source src={src} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
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