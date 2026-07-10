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
    <div className="mb-6 w-full">
      <div className="flex flex-col items-center gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-bold text-gray-900 text-center">
            View Current Top 20 Ranked
          </h3>
        </div>
        <button
          onClick={() => navigate("/rankings")}
          className="text-xs font-semibold text-pink-600 hover:text-pink-700 underline text-center"
        >
          View all rankings
        </button>
      </div>
      <p className="text-sm text-gray-600 mb-4 text-center">
        Top 20 Dimes win money every 3 months. Who's Next?
      </p>


      {dimes.length === 0 ? (
        <div className="text-sm text-gray-500 py-6 text-center">
          No ranked dimes yet this season — be the first!
        </div>
      ) : (
        <div className="w-full px-0 md:px-8">
          <Carousel opts={{ align: "start", loop: true }} className="w-full">
            <CarouselContent>
              {dimes.map((d) => (
                <CarouselItem
                  key={d.id}
                  className="basis-1/2 md:basis-1/4 lg:basis-1/6"
                >
                  <button
                    onClick={() => navigate(`/profile/${d.username}`)}
                    className="w-full rounded-lg overflow-hidden hover:shadow-md transition-all group"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 rounded-lg">
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
                    <div className="mt-1 text-center text-xs font-semibold text-gray-800 truncate px-1">
                      @{d.username}
                    </div>
                  </button>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden lg:flex" />
            <CarouselNext className="hidden lg:flex" />
          </Carousel>
        </div>
      )}
    </div>
  );
};

export default Top20DimesCarousel;
