import React, { useEffect, useState } from 'react';

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
  const [isMobile, setIsMobile] = useState(false);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const handleVideoError = () => {
    setVideoError(true);
  };

  return (
    <div className="relative w-full max-w-full mb-6 bg-black">
      <div className="relative w-full">
        <video
          key={isMobile ? srcMobile : srcDesktop}
          className="w-full h-auto max-w-full object-contain bg-black"
          controls
          autoPlay
          muted
          playsInline
          poster={thumbnailUrl}
          onError={handleVideoError}
        >
          <source src={isMobile ? srcMobile : srcDesktop} />
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
};

export default DashboardVideoHeader;