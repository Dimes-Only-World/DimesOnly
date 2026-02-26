import AgeVerification from "@/components/AgeVerification";
import HeroBanner from "@/components/HeroBanner";
import ReferrerProfile from "@/components/ReferrerProfile";
import GetStartedSteps from "@/components/GetStartedSteps";
import ReadyToStart from "@/components/ReadyToStart";
import LatestDimesCarousel from "@/components/LatestDimesCarousel";
import IncentivePositions from "@/components/IncentivePositions";
import SecurePlatform from "@/components/SecurePlatform";
import LandingFooter from "@/components/LandingFooter";

const Index = () => (
  <main className="min-h-screen bg-background">
    <AgeVerification />
    <HeroBanner />
    <ReferrerProfile />
    <GetStartedSteps />
    <ReadyToStart />
    <LatestDimesCarousel />
    <IncentivePositions />
    <SecurePlatform />
    <LandingFooter />
  </main>
);

export default Index;
