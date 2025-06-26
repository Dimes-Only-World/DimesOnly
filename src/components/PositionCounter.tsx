import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface PositionCounterProps {
  className?: string;
}

const PositionCounter: React.FC<PositionCounterProps> = ({
  className = "",
}) => {
  const [exoticCount, setExoticCount] = useState(1000);
  const [generalCount, setGeneralCount] = useState(3000);

  useEffect(() => {
    fetchCounts();
  }, []);

  const fetchCounts = async () => {
    try {
      // Query exotic/dancer users with proper count query
      const { count: exoticUsersCount, error: exoticError } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .in("user_type", ["exotic", "dancer", "stripper"]);

      // Query male/female users with proper count query
      const { count: generalUsersCount, error: generalError } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .in("gender", ["male", "female", "normal"]);

      if (!exoticError && exoticUsersCount !== null) {
        setExoticCount(Math.max(0, 1000 - exoticUsersCount));
      }
      if (!generalError && generalUsersCount !== null) {
        setGeneralCount(Math.max(0, 3000 - generalUsersCount));
      }
    } catch (error) {
      console.error("Error fetching counts:", error);
      // Keep default values on error
    }
  };

  return (
    <div className={`text-center py-8 bg-black ${className}`}>
      <div className="space-y-6">
        <h3 className="text-white text-xl md:text-2xl font-bold">
          INCENTIVE POSITIONS AVAILABLE NOW
        </h3>
        <h4 className="text-white text-lg md:text-xl font-bold">
          LEARN MORE INSIDE
        </h4>

        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-white text-base md:text-lg font-bold">
              EXOTIC FEMALES AND STRIPPERS
            </p>
            <p className="text-white text-base md:text-lg font-bold">
              FREE DIAMOND MEMBERSHIPS
            </p>
            <p className="text-white text-base md:text-lg font-bold">
              POSITIONS LEFT: {exoticCount}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-white text-base md:text-lg font-bold">
              NORMAL FEMALES AND MALE
            </p>
            <p className="text-white text-base md:text-lg font-bold">
              FREE SILVER MEMBERSHIP
            </p>
            <p className="text-white text-base md:text-lg font-bold">
              POSITIONS LEFT: {generalCount}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PositionCounter;
