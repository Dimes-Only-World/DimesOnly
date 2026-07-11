import React from 'react';
import LandingHeroBanner from '../components/landing/src/components/HeroBanner';
import ReferrerProfile from '../components/landing/src/components/ReferrerProfile';
import GetStartedSteps from '../components/landing/src/components/GetStartedSteps';
import ReadyToStart from '../components/landing/src/components/ReadyToStart';
import SecurePlatform from '../components/landing/src/components/SecurePlatform';
import LandingFooter from '../components/landing/src/components/LandingFooter';
import JackpotTipWin from '@/components/JackpotTipWin';

import PositionCounter from '@/components/PositionCounter';
import ImageCarousel from '@/components/ImageCarousel';
import bgVideo from '@/assets/BackGroundHomePage.webm.asset.json';

const NewIndex: React.FC = () => {
  return (
    <div className="min-h-screen bg-black">
      <LandingHeroBanner />
      <ReferrerProfile />

      {/* Fixed background video area wrapping Get Started + Join Free Now */}
      <div className="relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <video
            className="fixed top-0 left-0 w-screen h-screen object-cover -z-0"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          >
            <source src={bgVideo.url} type="video/webm" />
          </video>
          <div className="fixed top-0 left-0 w-screen h-screen bg-black/60 -z-0" />
        </div>
        <div className="relative z-10">
          <GetStartedSteps />
          <ReadyToStart />
        </div>
      </div>

      <JackpotTipWin />
      <ImageCarousel />

      <PositionCounter />
      <SecurePlatform />
      <LandingFooter />
    </div>
  );
};

export default NewIndex;
