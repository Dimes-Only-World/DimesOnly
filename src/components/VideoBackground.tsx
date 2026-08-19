import React from 'react';

interface VideoBackgroundProps {
  src?: string;
  videoUrl?: string;
  children?: React.ReactNode;
  className?: string;
}

const VideoBackground: React.FC<VideoBackgroundProps> = ({ src, videoUrl, children, className = '' }) => {
  const videoSrc = src || videoUrl;
  
  if (!videoSrc) {
    return children ? <div className={className}>{children}</div> : null;
  }

  return (
    <div className={`relative min-h-screen w-full overflow-hidden ${className}`}>
      {/* Video Background - Full Width */}
      <video
        className="absolute top-0 left-0 object-cover z-0"
        style={{ width: '100vw', height: '100%', marginLeft: '50%', transform: 'translateX(-50%)' }}
        autoPlay
        muted
        loop
        playsInline
      >
        <source src={videoSrc} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      
      {/* Content */}
      {children && (
        <div className="relative z-20 min-h-screen flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
};

export default VideoBackground;