import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { normalizeRefParam } from "@/lib/utils";
import { getRatingSeasonYear } from "@/lib/timeUtils";
import exo from "@/assets/exo.png" assert { type: "image" };
import money from "@/assets/money.png" assert { type: "image" };

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

/* --------------------------------------------------------------
   Fallback data (used when Supabase returns nothing)
   -------------------------------------------------------------- */
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

const fallbackPerformers: CarouselPerformer[] = Array.from(
  { length: 20 },
  (_, i) => ({
    id: `fallback-${i}`,
    username: `Model ${i + 1}`,
    image: fallbackImages[i % fallbackImages.length],
    rank: i + 1,
  })
);

/* --------------------------------------------------------------
   Main Component
   -------------------------------------------------------------- */
const ImageCarousel: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  const desktopScrollRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);

  const [topRanked, setTopRanked] = useState<RankedPerformer[]>([]);
  const [selectedPerformer, setSelectedPerformer] =
    useState<CarouselPerformer | null>(null);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLandscape, setIsLandscape] = useState(false);

  /* --------------------------------------------------------------
     Derived performers list (real data → fallback)
     -------------------------------------------------------------- */
  const performers: CarouselPerformer[] =
    topRanked.length > 0
      ? topRanked.map((u, i) => ({
          id: u.id,
          username: u.username,
          image:
            u.profile_photo ||
            u.front_page_photo ||
            fallbackPerformers[i % fallbackPerformers.length].image,
          rank: u.rank,
        }))
      : fallbackPerformers;

  /* --------------------------------------------------------------
     Helpers
     -------------------------------------------------------------- */
  const getRefParam = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return normalizeRefParam(urlParams.get("ref"));
  };

  const navigateToProfile = (username: string) => {
    window.location.href = `/profile/${encodeURIComponent(username)}`;
  };

  const scrollByCards = useCallback(
    (ref: React.RefObject<HTMLDivElement>, direction: number) => {
      const container = ref.current;
      if (!container || typeof window === "undefined") return;

      const card = container.querySelector<HTMLElement>("[data-carousel-card]");
      if (!card) return;

      const styles = window.getComputedStyle(container);
      const gap =
        parseFloat(
          styles.getPropertyValue("column-gap") ||
            styles.getPropertyValue("gap") ||
            "0"
        ) || 0;

      const scrollAmount = direction * (card.offsetWidth + gap);
      container.scrollBy({ left: scrollAmount, behavior: "smooth" });
    },
    []
  );

  const fetchPreviewVideo = async (performer: CarouselPerformer) => {
    if (performer.id.startsWith("fallback-")) {
      setSelectedVideoUrl(null);
      setIsLoadingMedia(false);
      return;
    }

    setIsLoadingMedia(true);
    setSelectedVideoUrl(null);

    try {
      // Fetch any video for this user (no content_tier filter)
      const { data, error } = await supabase
        .from("user_media")
        .select("media_url, storage_path")
        .eq("user_id", performer.id)
        .eq("media_type", "video")
        .order("upload_date", { ascending: false })
        .limit(1);

      console.log("[ImageCarousel] Video query result for", performer.username, ":", data, error);

      if (error) {
        console.error("[ImageCarousel] Error fetching video:", error);
      } else if (data?.[0]?.media_url) {
        const mediaUrl = String(data[0].media_url);
        
        // Check if video is in private-media bucket (needs signed URL)
        if (mediaUrl.includes("/private-media/")) {
          // Extract the path after the bucket name
          const pathMatch = mediaUrl.match(/\/private-media\/(.+)$/);
          if (pathMatch) {
            const storagePath = pathMatch[1];
            const { data: signedData, error: signedError } = await supabase.storage
              .from("private-media")
              .createSignedUrl(storagePath, 3600); // 1 hour expiry
            
            if (signedError) {
              console.error("[ImageCarousel] Error creating signed URL:", signedError);
              // Fall back to public URL (might work for some)
              setSelectedVideoUrl(mediaUrl);
            } else if (signedData?.signedUrl) {
              console.log("[ImageCarousel] Using signed URL for private video");
              setSelectedVideoUrl(signedData.signedUrl);
            }
          } else {
            setSelectedVideoUrl(mediaUrl);
          }
        } else {
          // Public bucket, use URL directly
          setSelectedVideoUrl(mediaUrl);
        }
      } else {
        console.log("[ImageCarousel] No video found for user:", performer.id);
      }
    } catch (err) {
      console.error("[ImageCarousel] Unexpected error loading preview:", err);
    } finally {
      setIsLoadingMedia(false);
    }
  };

  const openModalForPerformer = async (performer: CarouselPerformer) => {
    setSelectedPerformer(performer);
    setIsModalOpen(true);
    setSelectedVideoUrl(null);
    setIsLoadingMedia(true);

    void fetchPreviewVideo(performer);

    try {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!data?.session?.user);
    } catch (e) {
      console.error("[ImageCarousel] Auth check error:", e);
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
    setSelectedVideoUrl(null);
    setIsLoadingMedia(false);
  };

  const handleLoginClick = () => {
    if (!selectedPerformer) return;
    if (isAuthenticated) {
      navigateToProfile(selectedPerformer.username);
      return;
    }

    const ref = getRefParam();
    const url = new URL("/login", window.location.origin);
    url.searchParams.set(
      "redirect",
      `/profile/${encodeURIComponent(selectedPerformer.username)}`
    );
    if (ref) url.searchParams.set("ref", ref);
    window.location.href = url.toString();
  };

  const handleRegisterClick = () => {
    if (!selectedPerformer) return;
    const ref = getRefParam();
    const url = new URL("/register", window.location.origin);
    if (ref) url.searchParams.set("ref", ref);
    url.searchParams.set("target", selectedPerformer.username);
    window.location.href = url.toString();
  };

  /* --------------------------------------------------------------
     Orientation detection
     -------------------------------------------------------------- */
  useEffect(() => {
    const update = () => {
      if (typeof window === "undefined") return;
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  /* --------------------------------------------------------------
     Fetch top-ranked performers
     -------------------------------------------------------------- */
  useEffect(() => {
    let mounted = true;

    const fetch = async () => {
      try {
        const seasonYear = getRatingSeasonYear();

        const { data: ratings, error: rErr } = await supabase
          .from("ratings")
          .select("user_id, rating")
          .eq("year", seasonYear);

        if (rErr) {
          console.error("[ImageCarousel] Ratings error:", rErr);
          return;
        }

        const { data: users, error: uErr } = await supabase
          .from("public_user_profiles")
          .select("id, username, front_page_photo, profile_photo, user_type")
          .in("user_type", ["stripper", "exotic"]);

        if (uErr) {
          console.error("[ImageCarousel] Users error:", uErr);
          return;
        }

        if (!ratings || !users) return;

        const scores: Record<string, RankedPerformer> = {};

        users.forEach((u: any) => {
          scores[u.id] = {
            id: String(u.id),
            username: String(u.username),
            front_page_photo: u.front_page_photo
              ? String(u.front_page_photo)
              : null,
            profile_photo: u.profile_photo ? String(u.profile_photo) : null,
            total_score: 0,
            rating_count: 0,
            rank: 0,
          };
        });

        ratings.forEach((r: any) => {
          const entry = scores[r.user_id];
          if (entry) {
            entry.total_score += Number(r.rating);
            entry.rating_count += 1;
          }
        });

        // Show ONLY performers who have been rated (rating_count > 0), sorted by score
        const ranked = Object.values(scores)
          .filter((u) => u.rating_count > 0)
          .sort((a, b) => b.total_score - a.total_score)
          .slice(0, 20)
          .map((u, i) => ({ ...u, rank: i + 1 }));

        if (mounted) setTopRanked(ranked);
      } catch (e) {
        console.error("[ImageCarousel] Unexpected error:", e);
      }
    };

    fetch();
    return () => {
      mounted = false;
    };
  }, []);

  /* --------------------------------------------------------------
     Carousel renderer
     -------------------------------------------------------------- */
  const renderCarousel = (
    data: CarouselPerformer[],
    ref: React.RefObject<HTMLDivElement>,
    cardClass: string,
    controlClasses?: { left: string; right: string }
  ) => {
    const btnBase =
      "absolute top-1/2 -translate-y-1/2 z-10 flex items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-yellow-400";

    return (
      <div className="relative">
        {controlClasses && (
          <>
            <button
              type="button"
              onClick={() => scrollByCards(ref, -1)}
              className={`${btnBase} ${controlClasses.left}`}
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={() => scrollByCards(ref, 1)}
              className={`${btnBase} ${controlClasses.right}`}
              aria-label="Scroll right"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        <div
          ref={ref}
          className="flex gap-6 overflow-x-auto px-2 py-2 scrollbar-hide scroll-smooth snap-x snap-mandatory"
        >
          {data.map((p) => (
            <div
              key={p.id}
              data-carousel-card
              className={`${cardClass} group cursor-pointer`}
              onClick={() => handleImageClick(p)}
            >
              <div className="relative w-full h-full overflow-hidden rounded-3xl shadow-2xl transform transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-yellow-400/30">
                <img
                  src={p.image}
                  alt={`Rank ${p.rank} - ${p.username}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute top-4 left-4 bg-black/75 backdrop-blur rounded-full px-4 py-1 text-base md:text-lg font-semibold text-yellow-300 uppercase tracking-wide">
                  Rank #{p.rank}
                </div>
                <div className="absolute bottom-6 left-4 right-4 text-white">
                  <p className="font-semibold text-xl md:text-2xl">
                    @{p.username}
                  </p>
                  <p className="text-sm md:text-base text-gray-200 opacity-80">
                    Tap to preview
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /* --------------------------------------------------------------
     JSX
     -------------------------------------------------------------- */
  return (
    <div
      className={`w-full bg-gradient-to-b from-black via-gray-900 to-black py-10 ${className}`}
    >
      {/* ---------- HERO SECTION ---------- */}
      <div className="relative flex flex-col items-center justify-center bg-white text-black rounded-[50px] px-10 py-16 mx-10 my-10 md:px-16 md:py-20 shadow-2xl overflow-hidden h-[550px] md:h-[600px]">
        <img
          src={money}
          alt="money"
          className="absolute bottom-0 w-[85%] max-w-[600px] opacity-30"
        />

        <div className="relative z-10 text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-3 tracking-tight">
            Win{" "}
            <span className="text-[#E916D1]">
              $10,000
            </span>
          </h2>

          <p className="text-lg md:text-xl font-semibold text-gray-700 mb-4">
            Winner Announced at App Launch
          </p>

          <p className="text-base md:text-lg font-semibold text-gray-800 max-w-2xl mx-auto leading-relaxed">
            <span className="text-green-600">#1 Top Ranked</span> = $10,000{" "}
            <br />
            <span className="text-yellow-500">Rank Between #2 - #20</span> Win Money As
            Well
          </p>

          <button className="mt-8 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 transition-all duration-300 text-white font-semibold rounded-full shadow-lg">
            Winners Every 3 Months After Spots Below Say 0
          </button>

          <p className="mt-6 text-base md:text-lg font-semibold text-indigo-400 uppercase tracking-wide">
            AN ENTERTAINMENT APP FOR STRAIGHT MEN!
          </p>
        </div>
      </div>

      {/* ---------- CAROUSEL SECTION ---------- */}
      <section className="w-full py-10">
        <div className="text-center mb-8">
                    <h2 className="text-white text-2xl md:text-4xl font-bold mb-2 uppercase tracking-wide">
            VIEW CURRENT TOP 20 RANKED
          </h2>
          <p className="text-base md:text-lg text-gray-300">
            Top 20 Dimes win money every 3 months. Who’s Next?
          </p>
        </div>

        {/* Desktop */}
        <div className="hidden md:block overflow-hidden">
          {renderCarousel(
            performers,
            desktopScrollRef,
            "flex-shrink-0 w-72 h-[28rem]",
            {
              left: "hidden md:flex left-4 w-12 h-12",
              right: "hidden md:flex right-4 w-12 h-12",
            }
          )}
        </div>

        {/* Mobile */}
        <div className="block md:hidden overflow-hidden">
          {renderCarousel(
            performers,
            mobileScrollRef,
            "flex-shrink-0 w-56 h-80",
            {
              left: "flex md:hidden left-2 w-10 h-10",
              right: "flex md:hidden right-2 w-10 h-10",
            }
          )}
        </div>
      </section>

      {/* ---------- MODAL ---------- */}
      {isModalOpen && selectedPerformer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur p-4">
          <div
            className={`relative w-full ${
              isLandscape ? "max-w-md" : "max-w-3xl"
            } max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-black/70 flex flex-col`}
          >
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 z-10 text-white text-3xl font-bold bg-black/50 rounded-full px-3 py-1 hover:bg-black/80 transition"
              aria-label="Close preview"
            >
              ×
            </button>

            {/* Media container */}
            <div className="relative w-full bg-black flex items-center justify-center flex-1 overflow-hidden rounded-3xl">
              {isLoadingMedia ? (
                <div className="text-white text-lg">Loading preview…</div>
              ) : selectedVideoUrl ? (
                <video
                  key={selectedVideoUrl}
                  src={selectedVideoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls
                  controlsList="nodownload noremoteplayback"
                  disablePictureInPicture
                  onContextMenu={(e) => e.preventDefault()}
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={selectedPerformer.image}
                  alt={`Rank ${selectedPerformer.rank}`}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Rank badge */}
            <div className="absolute top-5 left-5 bg-black/75 px-4 py-1.5 rounded-full text-sm md:text-lg font-semibold text-yellow-300 uppercase tracking-wide shadow-lg">
              Rank #{selectedPerformer.rank}
            </div>

            {/* Bottom CTA */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/70 to-transparent p-5 md:p-6">
              <p className="text-white text-lg md:text-2xl font-bold mb-3">
                @{selectedPerformer.username}
              </p>

              <div className="flex flex-wrap gap-2 md:gap-4 justify-center md:justify-start">
                <button
                  onClick={handleLoginClick}
                  className="flex-1 basis-[48%] min-w-[120px] bg-neutral-900/90 hover:bg-neutral-800 text-white text-sm md:text-base font-semibold py-2 md:py-3 rounded-lg md:rounded-xl transition"
                >
                  {isAuthenticated ? "View Profile" : "Login"}
                </button>
                <button
                  onClick={handleRegisterClick}
                  className="flex-1 basis-[48%] min-w-[120px] bg-amber-600 hover:bg-amber-500 text-white text-sm md:text-base font-semibold py-2 md:py-3 rounded-lg md:rounded-xl transition"
                >
                  Sign Up
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hide native scrollbars */}
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
