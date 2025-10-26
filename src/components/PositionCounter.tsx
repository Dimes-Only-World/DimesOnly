import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";

import nudeImg from "@/assets/nude.png";
import exoticImg from "@/assets/exotic.jpg";
import stepsImg from "@/assets/steps.png";


interface PositionCounterProps {
  className?: string;
}

interface CounterData {
  current_count: number;
  max_count: number;
  available: boolean;
  remaining: number;
}

const PositionCounter: React.FC<PositionCounterProps> = ({ className = "" }) => {
  const [diamondPlusSpotsLeft, setDiamondPlusSpotsLeft] = useState(1000);
  const [silverPlusData, setSilverPlusData] = useState<CounterData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCounts();

    const subscription = supabase
      .channel("silver_plus_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
          filter: "silver_plus_active=eq.true",
        },
        () => fetchSilverPlusCounter()
      )
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, []);

  const fetchCounts = async () => {
    await Promise.all([fetchDiamondPlusCount(), fetchSilverPlusCounter()]);
    setLoading(false);
  };

  const fetchDiamondPlusCount = async () => {
    try {
      const { count, error } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("diamond_plus_active", true)
        .in("user_type", ["exotic", "stripper"]);

      if (!error && count !== null)
        setDiamondPlusSpotsLeft(Math.max(0, 1000 - count));
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
          remaining: counterInfo.max_count - counterInfo.current_count,
        });
      }
    } catch (error) {
      console.error("Silver Plus counter error:", error);
    }
  };

  const fadeIn = {
    hidden: { opacity: 0, y: 40 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
  };

  return (
    <div className={`py-16 px-5 bg-black ${className}`}>
      <div className="max-w-6xl mx-auto px-6 my-10">
        <div className="grid gap-12 grid-cols-1 md:grid-cols-2">
          {/* 💎 Diamond Plus Card */}
          <motion.div
            className="relative flex flex-col justify-end h-[500px] bg-[#0b0b0b] border border-gray-800 rounded-3xl overflow-hidden shadow-lg hover:shadow-indigo-500/30 transition-all duration-500"
            initial="hidden"
            animate="show"
            variants={fadeIn}
            whileHover={{ scale: 1.02 }}
          >
            {/* Background Image */}
            <div className="absolute inset-0">
              <img
                src={nudeImg}
                alt="diamond plus"
                className="w-full h-full object-cover object-center"
                loading="lazy"
                onError={(e) => (e.currentTarget.src = "/assets/placeholder.svg")}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />
            </div>

            {/* Content */}
            <div className="relative z-10 p-8 text-left">
              <p className="text-gray-300 text-sm tracking-widest uppercase font-semibold">
                Exotic Females & Strippers
              </p>
              <h3 className="text-2xl md:text-3xl font-bold text-indigo-400 mt-2">
                Diamond Plus Memberships
              </h3>
              <div className="mt-8 flex items-baseline gap-3">
                <span className="text-gray-400 uppercase tracking-wide text-sm">
                  Lifetime Positions Left:
                </span>
                <motion.span
                  key={diamondPlusSpotsLeft}
                  className="text-5xl font-extrabold text-indigo-300"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  {diamondPlusSpotsLeft}
                </motion.span>
              </div>
            </div>
          </motion.div>

          {/* 🥈 Silver Plus Card */}
          <motion.div
            className="relative flex flex-col justify-end h-[500px] bg-[#0b0b0b] border border-gray-800 rounded-3xl overflow-hidden shadow-lg hover:shadow-indigo-500/30 transition-all duration-500"
            initial="hidden"
            animate="show"
            variants={fadeIn}
            whileHover={{ scale: 1.02 }}
          >
            <div className="absolute inset-0">
              <img
                src={exoticImg}
                alt="silver plus"
                className="w-full h-full object-cover object-center"
                loading="lazy"
                onError={(e) => (e.currentTarget.src = "/assets/placeholder.svg")}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />
            </div>

            <div className="relative z-10 p-8 text-left">
              <p className="text-gray-300 text-sm tracking-widest uppercase font-semibold">
                Normal Females & Males
              </p>
              <h3 className="text-2xl md:text-3xl font-bold text-indigo-400 mt-2">
                Silver Plus Memberships
              </h3>
              <div className="mt-8 flex items-baseline gap-3">
                <span className="text-gray-400 uppercase tracking-wide text-sm">
                  Lifetime Positions Left:
                </span>
                <motion.span
                  key={silverPlusData?.remaining}
                  className="text-5xl font-extrabold text-indigo-300"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  {loading ? "..." : silverPlusData?.remaining ?? "N/A"}
                </motion.span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      <img src={stepsImg} alt="" />
    </div>
  );
};

export default PositionCounter;
