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

      {/* Fixed-feel background video wrapping Get Started + Join Free Now */}
      <div className="relative bg-black">
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          <video
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          >
            <source src={bgVideo.url} type="video/webm" />
          </video>
          <div className="absolute inset-0 bg-black/60" />
        </div>
        <div className="relative -mt-[100vh]">
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
