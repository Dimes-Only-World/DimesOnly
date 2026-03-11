import React, { useEffect, useState } from 'react';
import BannerVideo from '@/components/BannerVideo';

interface DashboardVideoHeaderProps {
  srcDesktop: string | null;
  srcMobile: string | null;
  thumbnailUrl?: string;
}

const DashboardVideoHeader: React.FC<DashboardVideoHeaderProps> = ({
  srcDesktop,
  srcMobile,
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const videoSrc = isMobile ? srcMobile : srcDesktop;

  if (!videoSrc) return null;

  return (
    <div className="w-full mb-6">
      <BannerVideo src={videoSrc} />
    </div>
  );
};

export default DashboardVideoHeader;
