import JoinFreeButton from "@/components/JoinFreeButton";
import React from "react";
import { motion } from "framer-motion";

import nudeImg from "@/assets/nude.png";
import step1Img from "@/assets/step1.png";
import step2Img from "@/assets/step2.png";
import step3Img from "@/assets/step3.png";
import TierSlideCard from "@/components/TierSlideCard";
import { useMembershipStage } from "@/hooks/useMembershipStage";
import eliteDimesA from "@/assets/tiers/elite-dimes-3.jpg.asset.json";
import eliteLoungeA from "@/assets/tiers/elite-lounge-2.jpg.asset.json";
import eliteTattooA from "@/assets/tiers/elite-tattoo.png.asset.json";
import silverCreamDressA from "@/assets/tiers/silver-cream-dress.png.asset.json";
import silverKnitDressA from "@/assets/tiers/silver-knit-dress.png.asset.json";
import silverSuitManA from "@/assets/tiers/silver-suit-man.png.asset.json";
import diamondLeopardA from "@/assets/tiers/diamond-leopard-2.png.asset.json";
import diamondPinkA from "@/assets/tiers/diamond-pink-2.png.asset.json";
const eliteDimes = eliteDimesA.url, eliteLounge = eliteLoungeA.url, eliteTattoo = eliteTattooA.url;
const silverCreamDress = silverCreamDressA.url, silverKnitDress = silverKnitDressA.url, silverSuitMan = silverSuitManA.url;
const diamondLeopard = diamondLeopardA.url, diamondPink = diamondPinkA.url;

interface PositionCounterProps {
  className?: string;
}


// 🔠 Word-by-word fade animation
const WordFade: React.FC<{text: string;delay?: number;}> = ({ text, delay = 0 }) => {
  const words = text.split(" ");
  return (
    <motion.span className="inline-block">
      {words.map((word, i) =>
      <motion.span
        key={i}
        className="inline-block mr-1"
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: delay + i * 0.05, duration: 0.45, ease: "easeOut" }}
        viewport={{ once: true }}>

          {word}
        </motion.span>
      )}
    </motion.span>);

};

const PositionCounter: React.FC<PositionCounterProps> = ({ className = "" }) => {
  const diamond = useMembershipStage("diamond_plus");
  const elite = useMembershipStage("business_owner_elite");
  const silver = useMembershipStage("silver_plus");
  const left = (m: { loading: boolean; remainingOverall: number }) => (m.loading ? "..." : m.remainingOverall);


  const fadeIn = {
    hidden: { opacity: 0, y: 40 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] as const } }
  };

  const steps = [
  {
    id: 1,
    title: "Sign Up For Free",
    text: "Sign up before guaranteed positions are gone",
    image: step1Img
  },
  {
    id: 2,
    title: "Fill Out Registration Form",
    text: "Exotics: Upload creative content to get approved. Everyone Else: Earn up to $10,000 to $22,500 a month GUARANTEED.",
    image: step2Img
  },
  {
    id: 3,
    title: "Build Your Money Circle",
    text: "Put all your followers in your Money Circle and make money daily.",
    image: step3Img
  }];


  return (
    <div className={`py-16 px-5 bg-black ${className}`}>
      {/* === MEMBERSHIP CARDS === */}
      <div className="max-w-6xl mx-auto px-6 my-10">
        <motion.h2
          className="text-3xl md:text-4xl font-semibold text-center mb-12 text-white"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeIn}>

          <span className="text-[#F4F6F8]"><WordFade text="Profit Sharing" /></span>{" "}<span className="text-[#E916D1]"><WordFade text="Positions" /></span>{" "}<span className="text-[#F4F6F8]"><WordFade text="Available Now!" /></span>
        </motion.h2>

        {/* === CARDS === */}
        <div className="-mx-11 grid grid-cols-1 gap-8 lg:mx-0 lg:grid-cols-3 lg:gap-6">
          <TierSlideCard
            slides={[
              { image: diamondLeopard },
              { image: diamondPink },
              { image: nudeImg },
            ]}
            title="Diamond Plus" remaining={left(diamond)} audience="Exotic Females & Strippers" tier1="Up to $125,000 annually" tier2="$1,170,000 minimum"
          />
          <TierSlideCard
            slides={[
              { image: eliteDimes },
              { image: eliteLounge },
              { image: eliteTattoo },
            ]}
            title="Elite Plus" remaining={left(elite)} audience="Business Owners" tier1="Up to $200,000 annually" tier2="$1,170,000 minimum"
          />
          <TierSlideCard
            slides={[
              { image: silverCreamDress },
              { image: silverKnitDress },
              { image: silverSuitMan },
            ]}
            title="Silver Plus" remaining={left(silver)} audience="Normal Females & Males" tier1="Up to $75,000 annually" tier2="$1,170,000 minimum"
          />

        </div>
        <div className="mt-10 text-center">
          <p className="text-white text-base md:text-lg mb-5">Profit sharing positions are limited. Join free to learn more.</p>
          <JoinFreeButton />
        </div>
      </div>

      {/* === 3 EASY STEPS SECTION === */}
      







































































    </div>);

};

export default PositionCounter;