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

const NewIndex: React.FC = () => {
  return (
    <div className="min-h-screen bg-black">
      <LandingHeroBanner />
      <ReferrerProfile />
      <GetStartedSteps />
      <ReadyToStart />
      <JackpotTipWin />
      <ImageCarousel />
      <LatestDimesCarousel />
      <PositionCounter />
      <SecurePlatform />
      <LandingFooter />
    </div>
  );
};

export default NewIndex;
