import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
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
  const navigate = useNavigate();
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

  const renderAvatar = (ref: Referral) => (
    <div key={ref.id} className="flex flex-col items-center min-w-0 w-full">
      <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white ring-1 ring-blue-200 bg-blue-100 flex items-center justify-center flex-shrink-0">
        {ref.profile_photo ? (
          <img
            src={ref.profile_photo}
            alt={ref.username}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-lg font-bold text-blue-700">
            {ref.username?.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <p
        className="text-xs font-semibold mt-2 text-center truncate text-slate-900 w-full max-w-[64px]"
        title={ref.username}
      >
        {ref.username}
      </p>
    </div>
  );

  return (
    <div className="w-full max-w-md mx-auto mb-6 p-5 bg-blue-50/60 rounded-xl border border-blue-200 shadow-sm">
      <h3 className="text-base font-semibold text-blue-700 mb-4 flex items-center gap-2">
        <Users className="w-4 h-4" />
        My Money Circle
      </h3>
      {firstThree.length > 0 ? (
        <>
          <div className="flex justify-center gap-4 mb-2">
            {firstThree.map((ref) => renderAvatar(ref))}
          </div>

          {expanded && hasMore && (
            <div className="max-h-72 overflow-y-auto mt-4 rounded-lg border border-blue-100 bg-white/70 p-3">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {remaining.map((ref) => renderAvatar(ref))}
              </div>
            </div>
          )}

          {hasMore && (
            <Button
              onClick={() => setExpanded((v) => !v)}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              {expanded
                ? "Hide Full Money Circle"
                : "To See Your Full Money Circle - Click Here"}
            </Button>
          )}

          {expanded && hasMore && (
            <Button
              onClick={() => navigate("/dashboard/referrals")}
              className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
            >
              Click Here for Full Details on Your Team
            </Button>
          )}
        </>
      ) : (
        <>
          <p className="text-center text-slate-600 text-sm mb-4">
            No One Yet!
          </p>
          <Button
            onClick={onGetLink}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Get Your Referral Link - Click Here
          </Button>
        </>
      )}
    </div>
  );
};

export default DashboardMoneyCircle;
