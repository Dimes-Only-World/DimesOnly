import React from 'react';
import HeroBanner from '@/components/HeroBanner';
import HomePromoRail from '@/components/HomePromoRail';
import FullWidthVideo from '@/components/FullWidthVideo';
import VideoWithEmbed from '@/components/VideoWithEmbed';
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
  // Single-slide promo rail configuration
  const promoSlides = [
    {
      id: 'tip-5-dime-tickets',
      kicker: 'Tip $5',
      title: 'Get 5 Dime Tickets',
      titleLines: ['Get', '5', 'Dime Tickets'],
      taglineLines: ['Pick', 'Tip a dime', 'Win'],
      highlightLineIndex: 1,
      subcopy: 'Jackpot Max $1.9 million weekly ',
      ctaLabel: 'Join Free Now',
      ctaHref: '/register?ref=company',
      ctaSubtext: 'No credit card required\n30s signup',
      secondaryCtaLabel: 'Tip Dimes Now',
      secondaryCtaHref: '/rate-girls',
      bgImage: '/assets/background%20.png',
      overlayLayouts: [
        // Main model (anchor on right) - highest z-index to stay in front
        { src: '/assets/dime_girl.png', className: 'desk-girl right-[26%] lg:right-[28%] h-[100%] z-[2]', showOnMobile: true, mobileClassName: 'mobile-girl -right-8 -bottom-40 h-[clamp(18rem,58vh,26rem)]' },
        // Roulette stack (behind model, center-right)
        { src: '/assets/dimelot.png', className: 'desk-dimelot top-1/2 -translate-y-1/2 right-[12%] lg:right-[2%] xl:right-[1%] h-[68%] sm:h-[70%] md:h-[72%] z-[1] drop-shadow-[0_8px_28px_rgba(0,0,0,0.55)]', showOnMobile: true, mobileClassName: 'mobile-dimelot right-1 bottom-[clamp(22rem,52vh,30rem)] h-[clamp(7.5rem,18vh,11rem)] z-[3]' },
        // Money cascade (next to girl, right side but not blocking)
        //{ src: '/assets/moneycasino.png', className: 'right-[4%] bottom-0 h-[36%] sm:h-[38%] md:h-[40%] opacity-85 z-[2] drop-shadow-[0_8px_30px_rgba(0,0,0,0.45)]', showOnMobile: true, mobileClassName: 'right-1 bottom-2 h-[20%] z-[2]' }
      ],
      pills: [
        'Tip and earn points',
        'concert-car-clothing',
        'and a whole lot more'
      ],
      footnote: 'Dimes Only promotions subject to terms.\nEligibility varies by region. See rules for jackpot details.',
      accent: 'yellow' as const,
    },
  ];
  return (
    <div className="min-h-screen bg-black">
      <HeroBanner />
      <HomePromoRail className="border-b border-white/10" autoPlayMs={0} slides={promoSlides} />
      <FullWidthVideo 
        src="https://dimesonlyworld.s3.us-east-2.amazonaws.com/HOME+PAGE+16-9+1080+final.mp4" 
      />
      <VideoWithEmbed />
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