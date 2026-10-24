import JoinFreeButton from "@/components/JoinFreeButton";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";

import nudeImg from "@/assets/nude.png";
import exoticImg from "@/assets/exotic.png";
import step1Img from "@/assets/step1.png";
import step2Img from "@/assets/step2.png";
import step3Img from "@/assets/step3.png";
import TierSlideCard from "@/components/TierSlideCard";
import { useMembershipStage } from "@/hooks/useMembershipStage";
import eliteSuit from "@/assets/tiers/elite-suit.png";
import eliteDesigner from "@/assets/tiers/elite-designer.png";
import eliteDress from "@/assets/tiers/elite-black-dress.png";
import silverTattoo from "@/assets/tiers/silver-tattoo.png";
import silverMan from "@/assets/tiers/silver-man.png";
import silverBeige from "@/assets/tiers/silver-beige.png";

interface PositionCounterProps {
  className?: string;
}

interface CounterData {
  current_count: number;
  max_count: number;
  available: boolean;
  remaining: number;
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
  const [diamondPlusSpotsLeft, setDiamondPlusSpotsLeft] = useState(300);
  const [silverPlusData, setSilverPlusData] = useState<CounterData | null>(null);
  const [loading, setLoading] = useState(true);
  const elite = useMembershipStage("business_owner_elite");

  useEffect(() => {
    fetchCounts();
    const subscription = supabase.
    channel("silver_plus_updates").
    on(
      "postgres_changes",
      { event: "*", schema: "public", table: "users", filter: "silver_plus_active=eq.true" },
      () => fetchSilverPlusCounter()
    ).
    subscribe();
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchCounts = async () => {
    await Promise.all([fetchDiamondPlusCount(), fetchSilverPlusCounter()]);
    setLoading(false);
  };

  const fetchDiamondPlusCount = async () => {
    try {
      const { data, error } = await supabase.rpc("get_diamond_plus_count");
      if (!error && data !== null) {
        setDiamondPlusSpotsLeft(Math.max(0, 300 - data));
      }
    } catch (error) {
      console.error("Diamond Plus count error:", error);
    }
  };

  const fetchSilverPlusCounter = async () => {
    try {
      const res: any = await supabase.rpc("check_silver_plus_availability");
      const data = res.data;
      const error = res.error;
      if (error) {
        console.error("Silver Plus counter error:", error);
        return;
      }
      if (data && Array.isArray(data) && data.length > 0) {
        const counterInfo = data[0];
        setSilverPlusData({
          current_count: counterInfo.current_count,
          max_count: counterInfo.max_count,
          available: counterInfo.available,
          remaining: counterInfo.max_count - counterInfo.current_count
        });
      }
    } catch (error) {
      console.error("Silver Plus counter error:", error);
    }
  };

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
            audience="Exotic Females & Strippers"
            title="Diamond Plus"
            remaining={diamondPlusSpotsLeft}
            slides={[
              { image: nudeImg, eyebrow: "Tier 1", headline: "Up to", amount: "$125,000", note: "Max annual profit sharing" },
              { image: exoticImg, eyebrow: "Tier 2", headline: "Minimum", amount: "$1,170,000", note: "Tier 2 profit sharing" },
              { image: nudeImg, eyebrow: "Act Fast", headline: "This won't last!", amount: "Limited", note: "Lifetime positions are going fast" },
            ]}
          />
          <TierSlideCard
            audience="Business Owners"
            title="Elite Plus"
            remaining={elite.loading ? "..." : elite.remainingOverall}
            slides={[
              { image: eliteSuit, eyebrow: "Tier 1", headline: "Up to", amount: "$200,000", note: "Max annual profit sharing" },
              { image: eliteDesigner, eyebrow: "Tier 2", headline: "Minimum", amount: "$1,170,000", note: "Tier 2 profit sharing" },
              { image: eliteDress, eyebrow: "Act Fast", headline: "This won't last!", amount: "Limited", note: "Lifetime positions are going fast" },
            ]}
          />
          <TierSlideCard
            audience="Normal Females & Males"
            title="Silver Plus"
            remaining={loading ? "..." : silverPlusData?.remaining ?? "N/A"}
            slides={[
              { image: silverMan, eyebrow: "Tier 1", headline: "Up to", amount: "$75,000", note: "Max annual profit sharing" },
              { image: silverTattoo, eyebrow: "Tier 2", headline: "Minimum", amount: "$1,170,000", note: "Tier 2 profit sharing" },
              { image: silverBeige, eyebrow: "Act Fast", headline: "This won't last!", amount: "Limited", note: "Lifetime positions are going fast" },
            ]}
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