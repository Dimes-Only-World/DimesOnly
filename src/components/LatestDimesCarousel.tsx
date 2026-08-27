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
  content_tier?: string | null;
};

type LatestVideoRow = {
  media_url?: string | null;
  signedUrl?: string | null;
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
        .from("public_user_profiles")
        .select("id, username, profile_photo, front_page_photo, created_at")
        .in("user_type", ["stripper", "exotic"])
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && data) {
        const rows = data as RawUserRow[];
        const mapped = rows.map((user, index) => ({
          id: String(user.id),
          username: user.username || `New Dime ${index + 1}`,
          image: user.profile_photo ?? user.front_page_photo ?? fallbackImages[index % fallbackImages.length],
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
      const { data, error } = await supabase.functions.invoke("public-data", {
        body: {
          action: "fetchLatestUserVideo",
          userId: performer.id,
          expiresIn: 3600,
        },
      });

      if (error) {
        console.error("[LatestDimesCarousel] Preview video function error:", error);
        return;
      }

      const row = data?.data as LatestVideoRow | null | undefined;
      const videoUrl = row?.signedUrl || row?.media_url;
      if (videoUrl) {
        setSelectedVideoUrl(videoUrl);
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
    const gapValue = parseFloat(styles.getPropertyValue("column-gap") || styles.getPropertyValue("gap") || "0") || 0;

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

  const navigateTip = () => {
    if (!selectedPerformer) return;

    const ref = getRefParam();
    const tipUrl = new URL("/tip", window.location.origin);
    tipUrl.searchParams.set("tip", selectedPerformer.username);
    if (ref) tipUrl.searchParams.set("ref", ref);
    window.location.href = tipUrl.toString();
  };


  return (
    <section className={`w-full bg-transparent py-12 md:py-16 ${className}`}>
      <div className="text-center mb-10 md:mb-12 px-4">
        <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full border border-[#E916D1]/30 bg-[#E916D1]/5 backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-[#E916D1] animate-pulse" />
          <span className="text-xs md:text-sm font-semibold uppercase tracking-[0.2em] text-[#E916D1]">
            Newest Members
          </span>
        </div>
        <h2 className="text-white text-3xl md:text-5xl font-extrabold uppercase tracking-tight leading-tight whitespace-pre-line">
          THE LAST{"\n"}<span className="text-[#E916D1]">20 DIMES</span>{"\n"}TO JOIN
        </h2>
        <div className="mx-auto mt-4 h-[3px] w-24 rounded-full bg-gradient-to-r from-transparent via-[#E916D1] to-transparent" />
        <p className="mt-5 text-base md:text-lg text-white max-w-xl mx-auto leading-relaxed">
          Fresh talent joining daily — tap any profile for an exclusive preview inside.
        </p>
      </div>

      <div className="relative w-full">
        <button
          type="button"
          onClick={() => scrollByCards(-1)}
          className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black/90 md:left-4 md:h-12 md:w-12"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <button
          type="button"
          onClick={() => scrollByCards(1)}
          className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black/90 md:right-4 md:h-12 md:w-12"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-3 md:gap-6 overflow-x-auto px-[20%] md:px-0 py-2 scroll-smooth snap-x snap-mandatory justify-start touch-pan-x [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {performers.map((performer) => (
            <div
              key={performer.id}
              data-carousel-card
              className="group flex-shrink-0 w-[60%] md:w-72 h-80 md:h-[28rem] snap-center md:snap-start"
              onClick={() => openModal(performer)}
            >
              <div className="relative w-full h-full overflow-hidden rounded-3xl shadow-2xl transform transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-yellow-400/30">
                <img
                  src={performer.image}
                  alt={`@${performer.username}`}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="eager"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (img.src !== fallbackImages[0]) {
                      img.src = fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
                    }
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute top-4 left-4 bg-black/75 backdrop-blur rounded-full px-4 py-1 text-base md:text-lg font-semibold text-yellow-300 uppercase tracking-wide">
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
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-3xl border border-white/10 bg-black/70 shadow-2xl flex flex-col">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 z-10 rounded-full bg-black/50 px-3 py-1 text-3xl font-bold text-white transition hover:bg-black/80"
              aria-label="Close preview"
            >
              ×
            </button>

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
                  onContextMenu={(event) => event.preventDefault()}
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={selectedPerformer.image}
                  alt={`@${selectedPerformer.username}`}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-5 md:p-6">
              <p className="mb-3 text-center text-lg md:text-2xl font-bold text-white">@{selectedPerformer.username}</p>
              <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4">
                <button
                  onClick={navigateLogin}
                  className="flex-1 basis-[48%] min-w-[120px] rounded-lg border border-[#E916D1] py-2 text-sm font-semibold text-[#E916D1] transition hover:bg-[#E916D1]/10 md:rounded-xl md:py-3 md:text-base"
                >
                  {isAuthenticated ? "View Profile" : "Login"}
                </button>
                <button
                  onClick={navigateTip}
                  className="flex-1 basis-[48%] min-w-[120px] rounded-lg bg-[#E916D1] py-2 text-sm font-semibold text-black transition hover:bg-[#E916D1]/90 md:rounded-xl md:py-3 md:text-base"
                >
                  Tip Her
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
