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

  // Desktop keeps a 16:9 frame; Mobile does NOT force a 16:9 aspect box
  const wrapperClass = isMobile
    ? 'relative w-screen' // let the video control its height on mobile
    : 'relative w-screen aspect-video'; // 16:9 only on desktop

  // Video class per device
  const videoClass = isMobile
    ? 'block w-screen h-auto max-h-[100vh] object-contain bg-black'
    : 'block w-full h-full object-contain bg-black';

  // Thumbnail class per device
  const thumbClass = isMobile
    ? 'w-screen h-auto object-contain bg-black'
    : 'w-full h-full object-contain bg-black';

  return (
    <div className="relative w-screen mb-6 bg-black">
      <div className={wrapperClass}>
        {!showVideo ? (
          <div className="relative w-full h-full">
            <img
              src={thumbnailUrl}
              alt="Video Thumbnail"
              className={thumbClass}
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
          <div className="relative w-full h-full">
            <video
              className={videoClass}
              controls
              autoPlay
              playsInline
              poster={thumbnailUrl}
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