import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

interface Referral {
  id: string;
  username: string;
  profile_photo: string | null;
  created_at: string;
}

interface DashboardMoneyCircleProps {
  userId: string;
  onViewAll: () => void;
  onGetLink: () => void;
}

const DashboardMoneyCircle: React.FC<DashboardMoneyCircleProps> = ({
  userId,
  onViewAll,
  onGetLink,
}) => {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReferrals = async () => {
      if (!userId) return;
      try {
        const { data, error } = await supabase.rpc("get_my_referrals", {
          p_user_id: userId,
        });
        if (!error && Array.isArray(data)) {
          setReferrals(data as Referral[]);
        }
      } catch (e) {
        console.warn("Failed to fetch referrals:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchReferrals();
  }, [userId]);

  if (loading) return null;

  const lastThree = [...referrals]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 3);

  return (
    <div className="w-full max-w-md mx-auto mb-6 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
      <h3 className="text-xl font-bold text-purple-700 mb-4 text-center">
        My Money Circle
      </h3>
      {lastThree.length > 0 ? (
        <>
          <div className="flex justify-center gap-4 mb-4">
            {lastThree.map((ref) => (
              <div key={ref.id} className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full ring-4 ring-purple-500 ring-offset-2 overflow-hidden bg-purple-200 flex items-center justify-center">
                  {ref.profile_photo ? (
                    <img
                      src={ref.profile_photo}
                      alt={ref.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-bold text-purple-700">
                      {ref.username?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold mt-2 text-center truncate max-w-[80px]">
                  {ref.username}
                </p>
              </div>
            ))}
          </div>
          <Button
            onClick={onViewAll}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            To See Your Full Money Circle - Click Here
          </Button>
        </>
      ) : (
        <>
          <p className="text-center text-gray-700 font-semibold mb-4">
            No One Yet!
          </p>
          <Button
            onClick={onGetLink}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            Get Your Referral Link - Click Here
          </Button>
        </>
      )}
    </div>
  );
};

export default DashboardMoneyCircle;
