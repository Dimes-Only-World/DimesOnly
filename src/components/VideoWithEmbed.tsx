import React, { useState } from 'react';

interface VideoWithEmbedProps {
  className?: string;
}

const VideoWithEmbed: React.FC<VideoWithEmbedProps> = ({ className = '' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);

  const handlePlayClick = () => {
    if (videoRef) {
      videoRef.muted = false;
      videoRef.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className={`relative w-full ${className}`}>
      <div className="relative w-full h-0" style={{ paddingBottom: '56.25%' }}>
        <video
          ref={setVideoRef}
          className="absolute top-0 left-0 w-full h-full object-cover"
          controls={isPlaying}
          muted
          playsInline
          poster="https://dimesonly.s3.us-east-2.amazonaws.com/Screenshot-2025-05-03-061023-1320x568.png"
        >
          <source src="https://dimesonlyworld.s3.us-east-2.amazonaws.com/Opening+XXx+FINAL+xXX+2.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={handlePlayClick}
              className="bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full transition-all duration-200 transform hover:scale-110"
              style={{ padding: '16px' }}
            >
              <svg className="w-12 h-12 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoWithEmbed;