import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

interface CarouselPerformer {
  id: string;
  username: string;
  image: string;
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

const fallbackPerformers: CarouselPerformer[] = Array.from({ length: 20 }).map((_, index) => ({
  id: `fallback-${index}`,
  username: `Model ${index + 1}`,
  image: fallbackImages[index % fallbackImages.length],
  rank: index + 1,
}));

const ImageCarousel: React.FC<{ className?: string }> = ({ className = "" }) => {
  const desktopScrollRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const [topRanked, setTopRanked] = useState<RankedPerformer[]>([]);
  const [selectedPerformer, setSelectedPerformer] = useState<CarouselPerformer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const performers: CarouselPerformer[] =
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

  const navigateToProfile = (username: string) => {
    window.location.href = `/profile/${encodeURIComponent(username)}`;
  };

  const scrollByCards = useCallback((ref: React.RefObject<HTMLDivElement>, direction: number) => {
    const container = ref.current;
    if (!container || typeof window === "undefined") return;

    const card = container.querySelector<HTMLElement>("[data-carousel-card]");
    if (!card) return;

    const styles = window.getComputedStyle(container);
    const gapValue =
      parseFloat(
        styles.getPropertyValue("column-gap") || styles.getPropertyValue("gap") || "0",
      ) || 0;

    const scrollAmount = direction * (card.offsetWidth + gapValue || card.offsetWidth);
    container.scrollBy({ left: scrollAmount, behavior: "smooth" });
  }, []);

  const openModalForPerformer = async (performer: CarouselPerformer) => {
    setSelectedPerformer(performer);
    setIsModalOpen(true);

    try {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(Boolean(data?.session?.user));
    } catch (error) {
      console.error("[ImageCarousel] Error checking auth state:", error);
      setIsAuthenticated(false);
    }
  };

  const handleImageClick = (performer?: CarouselPerformer) => {
    if (!performer || performer.id.startsWith("fallback-")) {
      const ref = getRefParam();
      window.location.href = `/register?ref=${encodeURIComponent(ref)}`;
      return;
    }

    void openModalForPerformer(performer);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPerformer(null);
  };

  const handleLoginClick = () => {
    if (!selectedPerformer) return;

    if (isAuthenticated) {
      navigateToProfile(selectedPerformer.username);
      return;
    }

    const ref = getRefParam();
    const loginUrl = new URL("/login", window.location.origin);
    loginUrl.searchParams.set("redirect", `/profile/${encodeURIComponent(selectedPerformer.username)}`);
    if (ref) loginUrl.searchParams.set("ref", ref);
    window.location.href = loginUrl.toString();
  };

  const handleRegisterClick = () => {
    if (!selectedPerformer) return;
    const ref = getRefParam();
    const registerUrl = new URL("/register", window.location.origin);
    if (ref) registerUrl.searchParams.set("ref", ref);
    registerUrl.searchParams.set("target", selectedPerformer.username);
    window.location.href = registerUrl.toString();
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

  const renderCarousel = (
    data: CarouselPerformer[],
    ref: React.RefObject<HTMLDivElement>,
    cardClass: string,
    controlClasses?: { left: string; right: string },
  ) => {
    const buttonBase =
      "absolute top-1/2 -translate-y-1/2 z-10 flex items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-yellow-400";

    return (
      <div className="relative">
        {controlClasses && (
          <>
            <button
              type="button"
              onClick={() => scrollByCards(ref, -1)}
              className={`${buttonBase} ${controlClasses.left}`}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={() => scrollByCards(ref, 1)}
              className={`${buttonBase} ${controlClasses.right}`}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        <div
          ref={ref}
          className="flex gap-6 overflow-x-auto px-2 py-2 scrollbar-hide scroll-smooth snap-x snap-mandatory"
        >
          {data.map((performer) => (
            <div
              key={performer.id}
              data-carousel-card
              className={`${cardClass} group`}
              onClick={() => handleImageClick(performer)}
            >
              <div className="relative w-full h-full overflow-hidden rounded-3xl shadow-2xl transform transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-yellow-400/30">
                <img
                  src={performer.image}
                  alt={`Rank ${performer.rank} - ${performer.username}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute top-4 left-4 bg-black/75 backdrop-blur rounded-full px-4 py-1 text-base md:text-lg font-semibold text-yellow-300 uppercase tracking-wide">
                  Rank #{performer.rank}
                </div>
                <div className="absolute bottom-6 left-4 right-4 text-white">
                  <p className="font-semibold text-xl md:text-2xl">@{performer.username}</p>
                  <p className="text-sm md:text-base text-gray-200 opacity-80">Tap to preview</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`w-full bg-gradient-to-b from-black via-gray-900 to-black py-8 ${className}`}>
      <div className="text-center mb-8">
        <h2 className="text-white text-2xl md:text-4xl font-bold mb-3 uppercase tracking-wide">
          Current Top 20 Ranked
        </h2>
        <p className="text-lg md:text-2xl font-semibold leading-relaxed text-white">
          <span className="text-yellow-400 animate-pulse drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]">
            $10,000 Every 3 Months
          </span>{" "}
          <br />Given to The #1 Top Rank
          <br />
          <span className="text-white">Rank #2 - #20 Get Money as Well</span>
        </p>
        <div className="w-24 h-1 bg-gradient-to-r from-pink-500 to-purple-500 mx-auto rounded-full mt-4" />
      </div>

      <div className="hidden md:block overflow-hidden">
        {renderCarousel(performers, desktopScrollRef, "flex-shrink-0 w-72 h-[28rem]", {
          left: "hidden md:flex left-4 w-12 h-12",
          right: "hidden md:flex right-4 w-12 h-12",
        })}
      </div>

      <div className="block md:hidden overflow-hidden">
        {renderCarousel(performers, mobileScrollRef, "flex-shrink-0 w-56 h-80", {
          left: "flex md:hidden left-2 w-10 h-10",
          right: "flex md:hidden right-2 w-10 h-10",
        })}
      </div>

      {isModalOpen && selectedPerformer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur">
          <div className="relative w-[90vw] max-w-xl rounded-3xl overflow-hidden shadow-2xl border border-white/10">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 z-10 text-white text-3xl font-bold bg-black/50 rounded-full px-3 py-1 hover:bg-black/80 transition"
              aria-label="Close preview"
            >
              ×
            </button>

            <img
              src={selectedPerformer.image}
              alt={`Rank ${selectedPerformer.rank}`}
              className="w-full h-[28rem] object-cover"
            />
            <div className="absolute top-5 left-5 bg-black/75 px-5 py-2 rounded-full text-lg font-semibold text-yellow-300 uppercase tracking-wide shadow-lg">
              Rank #{selectedPerformer.rank}
            </div>

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/70 to-transparent p-6">
              <p className="text-white text-2xl font-bold mb-4">@{selectedPerformer.username}</p>

              <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                <button
                  onClick={handleLoginClick}
                  className="w-full md:w-1/2 bg-neutral-900/90 hover:bg-neutral-800 text-white text-lg font-semibold py-3 rounded-xl transition"
                >
                  {isAuthenticated ? "View Profile" : "Login"}
                </button>
                <button
                  onClick={handleRegisterClick}
                  className="w-full md:w-1/2 bg-amber-600 hover:bg-amber-500 text-white text-lg font-semibold py-3 rounded-xl transition"
                >
                  Sign Up
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
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
