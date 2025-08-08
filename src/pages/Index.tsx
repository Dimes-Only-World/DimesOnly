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
import SilverPlusMembership from '@/components/SilverPlusMembership';
import SilverPlusCounter from '@/components/SilverPlusCounter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';

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
      <div className="flex flex-col items-center py-8">
        <div className="w-full max-w-2xl">
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 shadow-xl">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Crown className="w-6 h-6 text-blue-600" />
                <CardTitle className="text-blue-800 text-3xl font-bold">Silver Plus Memberships</CardTitle>
              </div>
              <Badge variant="secondary" className="bg-blue-600 text-white text-base py-1 px-4 rounded-full">Limited Time Offer</Badge>
            </CardHeader>
            <CardContent className="text-center">
              <SilverPlusCounter />
              {/* Compensation/Referral Info for homepage */}
              <div className="mt-6 text-left w-full max-w-md mx-auto">
                <h4 className="font-semibold text-blue-700 mb-2">Silver Plus Referral & Compensation</h4>
                <ul className="list-disc ml-6 text-sm text-blue-800 space-y-1">
                  <li>Earn <b>30%</b> of all Silver Plus memberships sold through your link.</li>
                  <li>Earn <b>20%</b> override on all free users who join under your link in Phase 2.</li>
                  <li>Earn <b>40%</b> of tips designated to you through your link.</li>
                  <li>Earn <b>20%</b> of tips if designated to you through someone else's link.</li>
                  <li>Earn <b>20%</b> of tips if they choose you to tip.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
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