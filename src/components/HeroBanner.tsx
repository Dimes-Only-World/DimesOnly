import React from 'react';

// Video-only hero: legacy slides removed.

const HeroBanner: React.FC = () => {
  const phoneSrc = 'https://dimesonlyworld.s3.us-east-2.amazonaws.com/9-16+HOME+(2).webm';
  const desktopSrc = 'https://dimesonlyworld.s3.us-east-2.amazonaws.com/16-9+HOME+(1).webm';
  return (
    <section
      className="relative w-full h-[100svh] min-h-[100svh] overflow-hidden bg-black"
      style={{ height: 'calc(var(--vh, 1vh) * 100)' }}
    >
      <style>
        {`
        /* Prefer desktop video on iPads (portrait and landscape) */
        @media only screen and (min-width: 744px) and (max-width: 1366px) {
          .hero-desktop-vid { display: block !important; }
          .hero-phone-vid { display: none !important; }
        }

        /* Small-height landscape phones (e.g., 360–480px tall) -> show full frame */
        @media screen and (orientation: landscape) and (max-height: 480px) {
          .hero-phone-vid { object-fit: contain !important; background: #000 !important; }
        }

        /* Phones in landscape (below 744px width): use desktop 16:9 source */
        @media screen and (max-width: 743px) and (orientation: landscape) {
          .hero-desktop-vid { display: block !important; }
          .hero-phone-vid { display: none !important; }
        }

        
        `}
      </style>
      {/* Desktop video (lg and up; iPads forced via media queries) */}
      <video
        className="hidden lg:block hero-desktop-vid absolute inset-0 w-full h-full object-cover object-center"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="https://dimesonly.s3.us-east-2.amazonaws.com/Screenshot-2025-05-03-061023-1320x568.png"
      >
        <source src={desktopSrc} type="video/mp4" />
      </video>
      {/* Phone video (below lg by default) - fill screen to avoid black bars */}
      <video
        className="block lg:hidden hero-phone-vid absolute inset-0 w-full h-full object-cover object-center"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="https://dimesonly.s3.us-east-2.amazonaws.com/Screenshot-2025-05-03-061023-1320x568.png"
      >
        <source src={phoneSrc} type="video/mp4" />
      </video>
    </section>
  );
};

export default HeroBanner;
