import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { Trophy, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getRatingSeasonYear } from "@/lib/timeUtils";

interface TopDime {
  id: string;
  username: string;
  profile_photo: string | null;
  total_score: number;
  rank: number;
}

const Top20DimesCarousel: React.FC = () => {
  const [dimes, setDimes] = useState<TopDime[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const seasonYear = getRatingSeasonYear();
        const { data: ratings } = await supabase
          .from("ratings")
          .select("user_id, rating")
          .eq("year", seasonYear);
        const { data: users } = await supabase
          .from("users")
          .select("id, username, profile_photo, user_type")
          .in("user_type", ["stripper", "exotic"]);
        if (!ratings || !users || cancelled) return;
        const scores: Record<string, TopDime> = {};
        users.forEach((u: any) => {
          scores[u.id] = {
            id: u.id,
            username: u.username,
            profile_photo: u.profile_photo,
            total_score: 0,
            rank: 0,
          };
        });
        ratings.forEach((r: any) => {
          if (scores[r.user_id]) scores[r.user_id].total_score += r.rating;
        });
        const top = Object.values(scores)
          .filter((u) => u.total_score > 0)
          .sort((a, b) => b.total_score - a.total_score)
          .slice(0, 20)
          .map((u, i) => ({ ...u, rank: i + 1 }));
        if (!cancelled) setDimes(top);
      } catch (e) {
        console.error("Top20 fetch error", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mb-6 rounded-xl border border-pink-300/60 bg-gradient-to-r from-pink-50 via-white to-yellow-50 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-bold text-gray-900">
            View Current Top 20 Ranked
          </h3>
        </div>
        <button
          onClick={() => navigate("/rankings")}
          className="text-xs font-semibold text-pink-600 hover:text-pink-700 underline"
        >
          View all rankings
        </button>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Top 20 Dimes win money every 3 months. Who's Next?
      </p>

      {dimes.length === 0 ? (
        <div className="text-sm text-gray-500 py-6 text-center">
          No ranked dimes yet this season — be the first!
        </div>
      ) : (
        <div className="px-8">
          <Carousel opts={{ align: "start", loop: true }} className="w-full">
            <CarouselContent>
              {dimes.map((d) => (
                <CarouselItem
                  key={d.id}
                  className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/6"
                >
                  <button
                    onClick={() => navigate(`/profile/${d.username}`)}
                    className="w-full rounded-lg overflow-hidden border border-gray-200 bg-white hover:border-pink-400 hover:shadow-md transition-all group"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
                      {d.profile_photo ? (
                        <img
                          src={d.profile_photo}
                          alt={`@${d.username}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-10 h-10 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2 bg-yellow-400 text-black text-xs font-bold rounded-full h-7 w-7 flex items-center justify-center shadow">
                        #{d.rank}
                      </div>
                    </div>
                    <div className="p-2">
                      <p className="text-gray-900 text-xs font-semibold truncate group-hover:text-pink-600">
                        @{d.username}
                      </p>
                    </div>
                  </button>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      )}
    </div>
  );
};

export default Top20DimesCarousel;
