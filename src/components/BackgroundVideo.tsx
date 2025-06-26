import React from 'react';

const BackgroundVideo: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <video
        autoPlay
        muted
        loop
        className="w-full h-full object-cover"
      >
        <source src="https://dimesonlyworld.s3.us-east-2.amazonaws.com/Opening+Page+f+(1).mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black bg-opacity-50" />
    </div>
  );
};

export { BackgroundVideo };
export default BackgroundVideo;