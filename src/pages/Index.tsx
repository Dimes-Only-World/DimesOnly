import React from 'react';
import HeroBanner from '@/components/HeroBanner';
import FullWidthVideo from '@/components/FullWidthVideo';
import VideoWithEmbed from '@/components/VideoWithEmbed';
import ProfileVideoSection from '@/components/ProfileVideoSection';
import ImageCarousel from '@/components/ImageCarousel';
import RefAwareActionButtons from '@/components/RefAwareActionButtons';
import PositionCounter from '@/components/PositionCounter';
import SecuritySection from '@/components/SecuritySection';
import Footer from '@/components/Footer';

const Index: React.FC = () => {
  return (
    <div className="min-h-screen bg-black">
      <HeroBanner />
      <FullWidthVideo 
        src="https://dimesonlyworld.s3.us-east-2.amazonaws.com/HOME+PAGE+16-9+1080+final.mp4" 
        className="-mt-4"
      />
      <VideoWithEmbed className="-mt-4" />
      <ProfileVideoSection className="-mt-4" />
      <ImageCarousel className="-mt-4" />
      <RefAwareActionButtons className="-mt-4" />
      <PositionCounter className="-mt-4" />
      <SecuritySection className="-mt-4" />
      <Footer />
    </div>
  );
};

export default Index;