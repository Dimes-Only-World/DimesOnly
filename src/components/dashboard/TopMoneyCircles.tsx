import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import defaultAvatar from "@/assets/default-avatar.png.asset.json";

interface TopCircle {
  user_id: string;
  username: string;
  profile_photo: string | null;
  circle_size: number;
}

/** Top 20 members ranked by the size of their money circle (number of referrals). */
const TopMoneyCircles: React.FC = () => {
  const [rows, setRows] = useState<TopCircle[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("v_top_money_circles")
          .select("user_id, username, profile_photo, circle_size")
          .order("circle_size", { ascending: false })
          .limit(20);
        if (!cancelled && data) setRows(data as TopCircle[]);
      } catch (e) {
        console.warn("top money circles load failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (rows.length === 0) return null;

  return (
    <div className="mb-5">
      <div className="mb-3 flex items-center justify-center gap-2">
        <Users className="h-5 w-5 text-dimes-magenta" />
        <h3 className="text-base font-extrabold tracking-tight sm:text-lg">
          Top 20 Largest Money Circles
        </h3>
      </div>
      {/* Wrapping flex acts as a grid on mobile/tablet and keeps an uneven last row centered */}
      <div className="flex flex-wrap items-start justify-center gap-x-4 gap-y-3">
        {rows.map((m, i) => (
          <Link
            key={m.user_id}
            to={`/profile/${m.username}`}
            className="flex w-16 flex-col items-center gap-1 sm:w-20"
          >
            <span className="relative rounded-full bg-gradient-to-tr from-dimes-magenta to-amber-400 p-[2px]">
              <img
                src={m.profile_photo || defaultAvatar.url}
                alt={m.username}
                loading="lazy"
                className="h-14 w-14 rounded-full border-2 border-white object-cover sm:h-16 sm:w-16"
              />
              <span className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white shadow">
                {i + 1}
              </span>
            </span>
            <span className="w-full truncate text-center text-[10px] font-semibold">
              @{m.username}
            </span>
            <span className="text-[10px] leading-tight text-muted-foreground">
              {m.circle_size} in circle
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default TopMoneyCircles;
