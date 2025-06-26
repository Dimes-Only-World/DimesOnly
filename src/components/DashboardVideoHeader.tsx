import React, { useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardVideoHeaderProps {
  videoUrl: string;
  thumbnailUrl: string;
}

const DashboardVideoHeader: React.FC<DashboardVideoHeaderProps> = ({ 
  videoUrl, 
  thumbnailUrl 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  const handlePlayClick = () => {
    setShowVideo(true);
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handlePlay = () => {
    setIsPlaying(true);
  };

  return (
    <div className="relative w-full h-64 md:h-80 lg:h-96 overflow-hidden rounded-lg mb-6">
      {!showVideo ? (
        <div className="relative w-full h-full">
          <img
            src={thumbnailUrl}
            alt="Video Thumbnail"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
            <Button
              onClick={handlePlayClick}
              size="lg"
              className="bg-white bg-opacity-90 hover:bg-opacity-100 text-black rounded-full p-4"
            >
              <Play className="w-8 h-8" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative w-full h-full">
          <video
            className="w-full h-full object-cover"
            controls
            autoPlay
            onPlay={handlePlay}
            onPause={handlePause}
            poster={thumbnailUrl}
          >
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      )}
    </div>
  );
};

export default DashboardVideoHeader;