import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { normalizeRefParam } from "@/lib/utils";

interface RankedPerformer {
  id: string;
  username: string;
  front_page_photo: string | null;
  profile_photo: string | null;
  total_score: number;
  rating_count: number;
  rank: number;
}

const fallbackImages = [
  "https://dimesonly.s3.us-east-2.amazonaws.com/eroticgirl_77f16c72-f054-4fcd-a954-208021412fb9-768x1250.png",
  "https://dimesonly.s3.us-east-2.amazonaws.com/Home-Dimes-5-768x1250.png",
  "https://dimesonly.s3.us-east-2.amazonaws.com/Home-Dime-3-768x1250.png",
  "https://dimesonly.s3.us-east-2.amazonaws.com/Home-Dime-4-768x1250.png",
  "https://dimesonly.s3.us-east-2.amazonaws.com/home-dime5-768x1250.png",
  "https://dimesonly.s3.us-east-2.amazonaws.com/Home-Dimes-1-768x1250.jpg",
  "https://dimesonly.s3.us-east-2.amazonaws.com/home-dimes2-768x1250.png",
  "https://dimesonly.s3.us-east-2.amazonaws.com/Home-Dimes-2-768x1250.png",
];

const fallbackPerformers = Array.from({ length: 20 }).map((_, index) => ({
  id: `fallback-${index}`,
  username: `Model ${index + 1}`,
  image: fallbackImages[index % fallbackImages.length],
  rank: index + 1,
}));

const ImageCarousel: React.FC<{ className?: string }> = ({ className = "" }) => {
  const desktopScrollRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const [topRanked, setTopRanked] = useState<RankedPerformer[]>([]);

  const performers =
    topRanked.length > 0
      ? topRanked.map((user, index) => ({
          id: user.id,
          username: user.username,
          image:
            user.profile_photo ||
            user.front_page_photo ||
            fallbackPerformers[index % fallbackPerformers.length].image,
          rank: user.rank,
        }))
      : fallbackPerformers;

  const getRefParam = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return normalizeRefParam(urlParams.get("ref"));
  };

  const handleImageClick = async (performer?: { id: string; username: string }) => {
    if (!performer || performer.id.startsWith("fallback-")) {
      const ref = getRefParam();
      window.location.href = `/register?ref=${encodeURIComponent(ref)}`;
      return;
    }

    try {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;

      if (!session?.user) {
        const ref = getRefParam();
        const loginUrl = new URL("/login", window.location.origin);
        loginUrl.searchParams.set("redirect", `/profile/${encodeURIComponent(performer.username)}`);
        if (ref) loginUrl.searchParams.set("ref", ref);
        window.location.href = loginUrl.toString();
        return;
      }

      window.location.href = `/profile/${encodeURIComponent(performer.username)}`;
    } catch (error) {
      console.error("[ImageCarousel] Error checking auth state:", error);
      const ref = getRefParam();
      window.location.href = `/register?ref=${encodeURIComponent(ref)}`;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchTopRanked = async () => {
      try {
        const currentYear = new Date().getFullYear();

        const { data: ratingsData, error: ratingsError } = await supabase
          .from("ratings")
          .select("user_id, rating")
          .eq("year", currentYear);

        if (ratingsError) {
          console.error("[ImageCarousel] Error fetching ratings:", ratingsError);
          return;
        }

        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id, username, front_page_photo, profile_photo, user_type")
          .in("user_type", ["stripper", "exotic"]);

        if (usersError) {
          console.error("[ImageCarousel] Error fetching users:", usersError);
          return;
        }

        if (!ratingsData || !usersData) {
          return;
        }

        const userScores: Record<string, RankedPerformer> = {};

        usersData.forEach((user: any) => {
          userScores[user.id] = {
            id: String(user.id),
            username: String(user.username),
            front_page_photo: user.front_page_photo ? String(user.front_page_photo) : null,
            profile_photo: user.profile_photo ? String(user.profile_photo) : null,
            total_score: 0,
            rating_count: 0,
            rank: 0,
          };
        });

        ratingsData.forEach((rating: any) => {
          const entry = userScores[rating.user_id];
          if (entry) {
            entry.total_score += Number(rating.rating);
            entry.rating_count += 1;
          }
        });

        const rankedUsers = Object.values(userScores)
          .filter((user) => user.rating_count > 0)
          .sort((a, b) => b.total_score - a.total_score)
          .slice(0, 20)
          .map((user, index) => ({
            ...user,
            rank: index + 1,
          }));

        if (isMounted) {
          setTopRanked(rankedUsers);
        }
      } catch (error) {
        console.error("[ImageCarousel] Unexpected error:", error);
      }
    };

    fetchTopRanked();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const desktopContainer = desktopScrollRef.current;
    if (desktopContainer) {
      let scrollAmount = 0;
      const scrollStep = 0.5;
      const scrollDelay = 16;

      const scroll = () => {
        scrollAmount += scrollStep;
        if (scrollAmount >= desktopContainer.scrollWidth / 2) {
          scrollAmount = 0;
        }
        desktopContainer.scrollLeft = scrollAmount;
      };

      const desktopInterval = setInterval(scroll, scrollDelay);
      return () => clearInterval(desktopInterval);
    }
  }, []);

  useEffect(() => {
    const mobileContainer = mobileScrollRef.current;
    if (mobileContainer) {
      let scrollAmount = 0;
      const scrollStep = 0.3;
      const scrollDelay = 16;

      const scroll = () => {
        scrollAmount += scrollStep;
        if (scrollAmount >= mobileContainer.scrollWidth / 2) {
          scrollAmount = 0;
        }
        mobileContainer.scrollLeft = scrollAmount;
      };

      const mobileInterval = setInterval(scroll, scrollDelay);
      return () => clearInterval(mobileInterval);
    }
  }, []);

  const renderCarousel = (
    data: { id: string; username: string; image: string; rank: number }[],
    ref: React.RefObject<HTMLDivElement>,
    cardClass: string
  ) => (
    <div ref={ref} className="flex overflow-x-hidden scrollbar-hide">
      {[...data, ...data].map((performer, index) => (
        <div
          key={`${performer.id}-${index}`}
          className={`${cardClass} group cursor-pointer`}
          onClick={() => handleImageClick(performer)}
        >
          <div className="relative w-full h-full overflow-hidden rounded-xl shadow-2xl transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-pink-500/25">
            <img
              src={performer.image}
              alt={`Rank ${performer.rank} - ${performer.username}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute top-4 left-4 bg-black/70 backdrop-blur rounded-full px-4 py-1 text-sm font-semibold text-yellow-300">
              Rank #{performer.rank}
            </div>
            <div className="absolute bottom-4 left-4 right-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <p className="font-semibold text-lg">@{performer.username}</p>
              <p className="text-sm text-gray-200">Click to see profile</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div
      className={`w-full bg-gradient-to-b from-black via-gray-900 to-black py-8 ${className}`}
    >
      <div className="text-center mb-8">
        <h2 className="text-white text-2xl md:text-4xl font-bold mb-3 uppercase tracking-wide">
          Current Top 20 Ranked
        </h2>
        <p className="text-lg md:text-2xl font-semibold leading-relaxed text-white">
          <span className="text-yellow-400 animate-pulse drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]">
            $10,000 Every 3 Months
          </span>{" "}
          Given to The #1 Top Rank
          <br />
          <span className="text-white">Rank #2 - #20 Get Money as Well</span>
        </p>
        <div className="w-24 h-1 bg-gradient-to-r from-pink-500 to-purple-500 mx-auto rounded-full mt-4" />
      </div>

      <div className="hidden md:block overflow-hidden">
        {renderCarousel(performers, desktopScrollRef, "flex-shrink-0 w-72 h-96 mx-3")}
      </div>

      <div className="block md:hidden overflow-hidden">
        {renderCarousel(performers, mobileScrollRef, "flex-shrink-0 w-56 h-80 mx-2")}
      </div>

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default ImageCarousel;