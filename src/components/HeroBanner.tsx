import React from 'react';

// Video-only hero: legacy slides removed.

const HeroBanner: React.FC = () => {
  const phoneSrc = 'https://dimesonlyworld.s3.us-east-2.amazonaws.com/9-16+HOME.mp4';
  const desktopSrc = 'https://dimesonlyworld.s3.us-east-2.amazonaws.com/16-9+HOME.mp4';
  return (
    <section className="relative w-full h-screen overflow-hidden bg-black">
      {/* Desktop video (md and up) */}
      <video
        className="hidden md:block absolute inset-0 w-full h-full object-cover"
        autoPlay
        muted
        loop
        playsInline
      >
        <source src={desktopSrc} type="video/mp4" />
      </video>
      {/* Phone video (smaller than md) */}
      <video
        className="block md:hidden absolute inset-0 w-full h-full object-cover"
        autoPlay
        muted
        loop
        playsInline
      >
        <source src={phoneSrc} type="video/mp4" />
      </video>
    </section>
  );
};

export default HeroBanner;