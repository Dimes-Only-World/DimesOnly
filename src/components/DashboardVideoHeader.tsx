import React, { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardVideoHeaderProps {
  srcDesktop: string;
  srcMobile: string;
  thumbnailUrl: string;
}

const DashboardVideoHeader: React.FC<DashboardVideoHeaderProps> = ({
  srcDesktop,
  srcMobile,
  thumbnailUrl,
}) => {
  const [showVideo, setShowVideo] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Detect mobile by viewport width (align with Tailwind md breakpoint)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const handlePlayClick = () => {
    setShowVideo(true);
  };

  const handleVideoError = () => {
    setVideoError(true);
    setShowVideo(false);
  };

  return (
    <div className="relative w-full max-w-full overflow-hidden mb-6 bg-black">
      <div className="relative w-full">
        {!showVideo || videoError ? (
          <div className="relative w-full">
            <img
              src={thumbnailUrl}
              alt="Video Thumbnail"
              className="w-full h-auto max-w-full object-contain bg-black"
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Button
                onClick={handlePlayClick}
                size="lg"
                className="bg-white/90 hover:bg-white text-black rounded-full p-4"
              >
                <Play className="w-8 h-8" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative w-full">
            <video
              className="w-full h-auto max-w-full object-contain bg-black"
              controls
              autoPlay
              playsInline
              poster={thumbnailUrl}
              onError={handleVideoError}
            >
              {/* Choose source based on viewport */}
              {isMobile ? (
                <source src={srcMobile} />
              ) : (
                <source src={srcDesktop} />
              )}
              Your browser does not support the video tag.
            </video>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardVideoHeader;