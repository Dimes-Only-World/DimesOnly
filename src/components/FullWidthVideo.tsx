import React from 'react';

interface FullWidthVideoProps {
  src: string;
  className?: string;
}

const FullWidthVideo: React.FC<FullWidthVideoProps> = ({ src, className = '' }) => {
  return (
    <div className={`relative w-screen bg-black ${className}`}>
      <video
        autoPlay
        loop
        muted
        playsInline
        className="block w-screen max-h-[100vh] object-contain mx-auto"
        style={{ width: '100vw' }}
      >
        <source src={src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default FullWidthVideo;