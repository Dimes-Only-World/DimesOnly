import React from 'react';
import HeroBanner from '@/components/HeroBanner';
import FullWidthVideo from '@/components/FullWidthVideo';
//import VideoWithEmbed from '@/components/VideoWithEmbed';
import ProfileVideoSection from '@/components/ProfileVideoSection';
import ImageCarousel from '@/components/ImageCarousel';
import RefAwareActionButtons from '@/components/RefAwareActionButtons';
import PositionCounter from '@/components/PositionCounter';
import SecuritySection from '@/components/SecuritySection';
import Footer from '@/components/Footer';

const Index: React.FC = () => {
  // Use a fully populated dummyUserData to satisfy the SilverPlusMembership type
  const dummyUserData = {
    id: '',
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    bio: '',
    profile_photo: '',
    banner_photo: '',
    user_type: '',
    gender: '',
    about_me: '',
    address: '',
    city: '',
    created_at: '',
    description: '',
    front_page_photo: '',
    hash_type: '',
    is_ranked: null,
    lottery_tickets: null,
    membership_tier: '',
    membership_type: '',
    mobile_number: '',
    occupation: '',
    overrides: null,
    password_hash: '',
    paypal_email: '',
    rank_number: null,
    referral_fees: null,
    referred_by: '',
    referred_by_photo: '',
    register_order: null,
    state: '',
    tips_earned: null,
    updated_at: '',
    user_rank: null,
    weekly_earnings: null,
    weekly_hours: null,
    zip: '',
    diamond_plus_active: null,
    diamond_plus_signed_at: '',
    diamond_plus_payment_id: '',
    membership_count_position: null,
    phone_number: '',
    agreement_signed: null,
    notarization_completed: null,
    silver_plus_active: null,
    silver_plus_joined_at: '',
    silver_plus_payment_id: '',
    silver_plus_membership_number: null
  };
  return (
    <div className="min-h-screen bg-black">
      <HeroBanner />
      <FullWidthVideo 
        src="https://dimesonlyworld.s3.us-east-2.amazonaws.com/HOME+PAGE+16-9+1080+final.mp4" 
      />
      {/* <VideoWithEmbed /> */}
      <ProfileVideoSection />
      <ImageCarousel />
      <RefAwareActionButtons />
      <PositionCounter />
      <SecuritySection />
      <Footer />
    </div>
  );
};

export default Index;
