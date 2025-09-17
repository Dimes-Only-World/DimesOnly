import React from 'react';

const HeroBanner: React.FC = () => {
  const phoneSrc = 'https://dimesonlyworld.s3.us-east-2.amazonaws.com/9-16_HOME.m3u8';
  const phoneMp4Src = 'https://dimesonlyworld.s3.us-east-2.amazonaws.com/9-16_HOME.mp4';
  const desktopSrc = 'https://dimesonlyworld.s3.us-east-2.amazonaws.com/16-9_HOME.m3u8';
  const desktopMp4Src = 'https://dimesonlyworld.s3.us-east-2.amazonaws.com/16-9_HOME.mp4';

  return (
    <section className="relative w-full h-[100dvh] overflow-hidden bg-black">
      <style>
        {`
          /* Reset margins and ensure full viewport */
          html, body {
            margin: 0;
            padding: 0;
            height: 100%;
            overflow: hidden;
          }

          /* Base video styles */
          video {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100dvh; /* Dynamic viewport for mobile UI */
            object-fit: cover; /* Fills screen, crops edges */
            object-position: center;
            display: block;
          }

          /* Phone video (9:16) for portrait or narrow screens */
          @media (max-aspect-ratio: 1/1) or (max-width: 767px) {
            .hero-desktop-vid { display: none !important; }
            .hero-phone-vid { display: block !important; }
          }

          /* Desktop video (16:9) for landscape or wider screens */
          @media (min-aspect-ratio: 1/1) and (min-width: 768px) {
            .hero-desktop-vid { display: block !important; }
            .hero-phone-vid { display: none !important; }
          }
        `}
      </style>
      <video
        className="hero-desktop-vid"
        autoPlay
        muted
        playsInline
        loop
        preload="auto"
        poster="https://dimesonlyworld.s3.us-east-2.amazonaws.com/16-9_HOME_poster.jpg"
      >
        <source src={desktopSrc} type="application/x-mpegURL" />
        <source src={desktopMp4Src} type="video/mp4" />
      </video>
      <video
        className="hero-phone-vid"
        autoPlay
        muted
        playsInline
        loop
        preload="auto"
        poster="https://dimesonlyworld.s3.us-east-2.amazonaws.com/9-16_HOME_poster.jpg"
      >
        <source src={phoneSrc} type="application/x-mpegURL" />
        <source src={phoneMp4Src} type="video/mp4" />
      </video>
    </section>
  );
};

export default HeroBanner;
