import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { normalizeRefParam } from "@/lib/utils";

interface LatestPerformer {
  id: string;
  username: string;
  image: string;
  created_at: string | null;
}

type RawUserRow = {
  id: string | number;
  username: string | null;
  profile_photo: string | null;
  front_page_photo: string | null;
  created_at: string | null;
};

type RawMediaRow = {
  media_url: string | null;
};

const fallbackImages = [
  "https://dimesonly.s3.us-east-2.amazonaws.com/Home-Dime-3-768x1250.png",
  "https://dimesonly.s3.us-east-2.amazonaws.com/Home-Dime-4-768x1250.png",
  "https://dimesonly.s3.us-east-2.amazonaws.com/home-dime5-768x1250.png",
  "https://dimesonly.s3.us-east-2.amazonaws.com/Home-Dimes-1-768x1250.jpg",
  "https://dimesonly.s3.us-east-2.amazonaws.com/home-dimes2-768x1250.png",
  "https://dimesonly.s3.us-east-2.amazonaws.com/Home-Dimes-2-768x1250.png",
];

const fallbackPerformers: LatestPerformer[] = Array.from({ length: 6 }).map((_, index) => ({
  id: `fallback-${index}`,
  username: `New Dime ${index + 1}`,
  image: fallbackImages[index % fallbackImages.length],
  created_at: null,
}));

const LatestDimesCarousel: React.FC<{ className?: string }> = ({ className = "" }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [performers, setPerformers] = useState<LatestPerformer[]>(fallbackPerformers);
  const [selectedPerformer, setSelectedPerformer] = useState<LatestPerformer | null>(null);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const getRefParam = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return normalizeRefParam(urlParams.get("ref"));
  };

  const fetchLatestPerformers = useCallback(async () => {
    try {
      const { data, error } = await supabase
  .from("users")
  .select("id, username, profile_photo, front_page_photo, created_at")
  .in("user_type", ["stripper", "exotic"])
  .order("created_at", { ascending: false })
  .limit(20);

if (!error && data) {
  const rows = data as RawUserRow[];
  const mapped = rows.map((user, index) => ({
    id: String(user.id),
    username: user.username || `New Dime ${index + 1}`,
    image:
      user.profile_photo ??
      user.front_page_photo ??
      fallbackImages[index % fallbackImages.length],
    created_at: user.created_at,
  }));
  setPerformers(mapped);
}
    } catch (err) {
      console.error("[LatestDimesCarousel] Failed to fetch latest performers:", err);
    }
  }, []);

  useEffect(() => {
    fetchLatestPerformers();
  }, [fetchLatestPerformers]);

  const fetchPreviewVideo = async (performer: LatestPerformer) => {
    if (performer.id.startsWith("fallback-")) {
      setSelectedVideoUrl(null);
      setIsLoadingMedia(false);
      return;
    }

    setIsLoadingMedia(true);
    setSelectedVideoUrl(null);

    try {
      const { data, error } = await supabase
      .from("user_media")
      .select("media_url")
      .eq("user_id", performer.id)
      .eq("media_type", "video")
      .eq("content_tier", "silver")
      .order("upload_date", { ascending: false })
      .limit(1);

      if (!error && data) {
      const rows = data as RawMediaRow[];
      const url = rows[0]?.media_url;
      if (url) setSelectedVideoUrl(url);
      }
    } catch (err) {
      console.error("[LatestDimesCarousel] Failed to load preview:", err);
    } finally {
      setIsLoadingMedia(false);
    }
  };

  const openModal = async (performer: LatestPerformer) => {
    setSelectedPerformer(performer);
    setIsModalOpen(true);
    setSelectedVideoUrl(null);
    setIsLoadingMedia(true);

    void fetchPreviewVideo(performer);
    try {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(Boolean(data?.session?.user));
    } catch (error) {
      console.error("[LatestDimesCarousel] Error checking auth state:", error);
      setIsAuthenticated(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPerformer(null);
    setSelectedVideoUrl(null);
    setIsLoadingMedia(false);
  };

  const scrollByCards = (direction: number) => {
    const container = scrollRef.current;
    if (!container || typeof window === "undefined") return;

    const card = container.querySelector<HTMLElement>("[data-carousel-card]");
    if (!card) return;

    const styles = window.getComputedStyle(container);
    const gapValue =
      parseFloat(styles.getPropertyValue("column-gap") || styles.getPropertyValue("gap") || "0") || 0;

    const scrollAmount = direction * (card.offsetWidth + gapValue || card.offsetWidth);
    container.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  const navigateLogin = () => {
    if (!selectedPerformer) return;

    if (isAuthenticated) {
      window.location.href = `/profile/${encodeURIComponent(selectedPerformer.username)}`;
      return;
    }

    const ref = getRefParam();
    const loginUrl = new URL("/login", window.location.origin);
    loginUrl.searchParams.set("redirect", `/profile/${encodeURIComponent(selectedPerformer.username)}`);
    if (ref) loginUrl.searchParams.set("ref", ref);
    window.location.href = loginUrl.toString();
  };

  const navigateRegister = () => {
    if (!selectedPerformer) return;

    const ref = getRefParam();
    const registerUrl = new URL("/register", window.location.origin);
    if (ref) registerUrl.searchParams.set("ref", ref);
    registerUrl.searchParams.set("target", selectedPerformer.username);
    window.location.href = registerUrl.toString();
  };

  return (
    <section className={`w-full bg-gradient-to-b from-black via-gray-950 to-black py-10 ${className}`}>
      <div className="text-center mb-8">
        <h2 className="text-white text-2xl md:text-4xl font-bold mb-2 uppercase tracking-wide">
          Latest 20 Dimes to Join
        </h2>
        <p className="text-base md:text-lg text-gray-300">
          See More Inside · Baddies Joining Daily
        </p>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => scrollByCards(-1)}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black/90 md:left-4 md:h-12 md:w-12"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <button
          type="button"
          onClick={() => scrollByCards(1)}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black/90 md:right-4 md:h-12 md:w-12"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto px-4 py-2 scrollbar-hide scroll-smooth snap-x snap-mandatory"
        >
          {performers.map((performer) => (
            <div
              key={performer.id}
              data-carousel-card
              className="group flex-shrink-0 w-56 h-80 md:w-72 md:h-[28rem]"
              onClick={() => openModal(performer)}
            >
              <div className="relative h-full w-full overflow-hidden rounded-3xl border border-white/5 bg-black shadow-2xl transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-pink-500/30">
                <img
                  src={performer.image}
                  alt={`@${performer.username}`}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <div className="absolute top-4 left-4 rounded-full bg-fuchsia-600/80 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                  New Dime
                </div>
                <div className="absolute bottom-6 left-4 right-4 text-white">
                  <p className="text-xl md:text-2xl font-semibold">@{performer.username}</p>
                  <p className="text-xs md:text-sm text-gray-200 opacity-80">Tap to preview</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && selectedPerformer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur p-4">
          <div className="relative w-full max-w-md md:max-w-3xl max-h-[90vh] overflow-hidden rounded-3xl border border-white/10 bg-black/70 shadow-2xl">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 z-10 rounded-full bg-black/50 px-3 py-1 text-3xl font-bold text-white transition hover:bg-black/80"
              aria-label="Close preview"
            >
              ×
            </button>

            <div className="flex min-h-[50vh] items-center justify-center bg-black p-4">
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
                  className="h-full max-h-[70vh] w-full object-contain"
                />
              ) : (
                <img
                  src={selectedPerformer.image}
                  alt={`@${selectedPerformer.username}`}
                  className="h-full max-h-[70vh] w-full rounded-xl object-cover"
                />
              )}
            </div>

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-5 md:p-6">
              <p className="mb-3 text-center text-lg md:text-2xl font-bold text-white">
                @{selectedPerformer.username}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4">
                <button
                  onClick={navigateLogin}
                  className="flex-1 basis-[48%] min-w-[120px] rounded-lg bg-neutral-900/90 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 md:rounded-xl md:py-3 md:text-base"
                >
                  {isAuthenticated ? "View Profile" : "Login"}
                </button>
                <button
                  onClick={navigateRegister}
                  className="flex-1 basis-[48%] min-w-[120px] rounded-lg bg-pink-600 py-2 text-sm font-semibold text-white transition hover:bg-pink-500 md:rounded-xl md:py-3 md:text-base"
                >
                  Sign Up
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default LatestDimesCarousel;