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
  onViewAll?: () => void;
  onGetLink: () => void;
}

const DashboardMoneyCircle: React.FC<DashboardMoneyCircleProps> = ({
  userId,
  onGetLink,
}) => {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchReferrals = async () => {
      if (!userId) return;
      try {
        const { data: rpcData } = await supabase.rpc("get_my_referrals");
        if (Array.isArray(rpcData) && rpcData.length > 0) {
          setReferrals(rpcData as Referral[]);
          setLoading(false);
          return;
        }

        const { data: userRow } = await supabase
          .from("users")
          .select("username")
          .eq("id", userId)
          .maybeSingle();

        const username = (userRow as any)?.username;
        if (!username) {
          setLoading(false);
          return;
        }

        const { data: refs } = await supabase
          .from("users")
          .select("id, username, profile_photo, created_at")
          .ilike("referred_by", username)
          .order("created_at", { ascending: false });

        if (Array.isArray(refs)) setReferrals(refs as Referral[]);
      } catch (e) {
        console.warn("Failed to fetch referrals:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchReferrals();
  }, [userId]);

  if (loading) return null;

  const sorted = [...referrals].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const firstThree = sorted.slice(0, 3);
  const remaining = sorted.slice(3);
  const hasMore = remaining.length > 0;

  const renderAvatar = (ref: Referral, ringSize: "lg" | "sm" = "lg") => (
    <div key={ref.id} className="flex flex-col items-center">
      <div
        className={`${
          ringSize === "lg" ? "w-16 h-16 ring-4" : "w-14 h-14 ring-2"
        } rounded-full ring-[#E916D1] ring-offset-2 ring-offset-slate-900 overflow-hidden bg-purple-900/40 flex items-center justify-center`}
      >
        {ref.profile_photo ? (
          <img
            src={ref.profile_photo}
            alt={ref.username}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-xl font-bold text-white">
            {ref.username?.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <p className="text-xs font-semibold mt-2 text-center truncate max-w-[80px] text-white">
        {ref.username}
      </p>
    </div>
  );

  return (
    <div className="w-full max-w-md mx-auto mb-6 p-4 bg-gradient-to-br from-slate-900 to-purple-900/40 rounded-xl border border-purple-500/30 shadow-lg">
      <h3 className="text-xl font-bold text-[#E916D1] mb-4 text-center">
        My Money Circle
      </h3>
      {firstThree.length > 0 ? (
        <>
          <div className="flex justify-center gap-4 mb-4">
            {firstThree.map((ref) => renderAvatar(ref, "lg"))}
          </div>

          {expanded && hasMore && (
            <div className="max-h-72 overflow-y-auto mb-4 rounded-lg border border-purple-500/20 bg-slate-900/40 scrollbar-thin scrollbar-thumb-purple-500/50">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 p-3">
                {remaining.map((ref) => renderAvatar(ref, "sm"))}
              </div>
            </div>
          )}

          {hasMore && (
            <Button
              onClick={() => setExpanded((v) => !v)}
              className="w-full bg-[#E916D1] hover:bg-[#E916D1]/90 text-white"
            >
              {expanded
                ? "Hide Full Money Circle"
                : "To See Your Full Money Circle - Click Here"}
            </Button>
          )}
        </>
      ) : (
        <>
          <p className="text-center text-white font-semibold mb-4">
            No One Yet!
          </p>
          <Button
            onClick={onGetLink}
            className="w-full bg-[#E916D1] hover:bg-[#E916D1]/90 text-white"
          >
            Get Your Referral Link - Click Here
          </Button>
        </>
      )}
    </div>
  );
};

export default DashboardMoneyCircle;
