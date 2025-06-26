import React from 'react';

interface FullWidthVideoProps {
  src: string;
  className?: string;
}

const FullWidthVideo: React.FC<FullWidthVideoProps> = ({ src, className = '' }) => {
  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      <video
        autoPlay
        loop
        muted
        playsInline
        className="w-screen h-auto block"
        style={{ width: '100vw', marginLeft: '50%', transform: 'translateX(-50%)' }}
      >
        <source src={src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default FullWidthVideo;