import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface PositionCounterProps {
  className?: string;
}

interface CounterData {
  current_count: number;
  max_count: number;
  available: boolean;
  remaining: number;
}

const PositionCounter: React.FC<PositionCounterProps> = ({
  className = "",
}) => {
  const [diamondPlusSpotsLeft, setDiamondPlusSpotsLeft] = useState(1000);
  const [silverPlusData, setSilverPlusData] = useState<CounterData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    fetchCounts();

    // Set up real-time subscription for Silver Plus counter
    const subscription = supabase
      .channel('silver_plus_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: 'silver_plus_active=eq.true'
        },
        () => {
          // When a user's silver_plus_active changes, refetch the counter
          fetchSilverPlusCounter();
        }
      )
      .subscribe();

    // Clean up subscription on unmount
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchCounts = async () => {
    await Promise.all([
      fetchDiamondPlusCount(),
      fetchSilverPlusCounter()
    ]);
    setLoading(false);
  };

  const fetchDiamondPlusCount = async () => {
    try {
      // Count active diamond plus users directly (client wants 1000 total cap)
      const { count: diamondPlusCount, error: countError } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("diamond_plus_active", true)
        .in("user_type", ["exotic", "stripper"]);

      if (!countError && diamondPlusCount !== null) {
        setDiamondPlusSpotsLeft(Math.max(0, 1000 - diamondPlusCount)); // Use 1000 cap as client requested
      }
    } catch (error) {
      console.error("Error fetching Diamond Plus count:", error);
    }
  };

  const fetchSilverPlusCounter = async () => {
    try {
      const { data, error } = await supabase
        .rpc('check_silver_plus_availability');

      if (error) {
        console.error("Error fetching Silver Plus counter:", error);
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
      console.error("Error fetching Silver Plus counter:", error);
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
              DIAMOND PLUS MEMBERSHIPS
            </p>
            <p className="text-white text-base md:text-lg font-bold">
              LIFETIME POSITIONS LEFT: {diamondPlusSpotsLeft}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-white text-base md:text-lg font-bold">
              NORMAL FEMALES AND MALE
            </p>
            <p className="text-white text-base md:text-lg font-bold">
              SILVER PLUS MEMBERSHIP
            </p>
            <p className="text-white text-base md:text-lg font-bold">
              LIFETIME POSITIONS LEFT: {loading ? '...' : (silverPlusData?.remaining ?? 'N/A')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PositionCounter;
