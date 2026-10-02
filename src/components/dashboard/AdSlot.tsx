import React, { useEffect, useRef } from "react";
import { DashboardAd, recordAdClick, recordAdImpression } from "@/lib/dashboardAds";
import { useAppContext } from "@/contexts/AppContext";

interface Props {
  ad: DashboardAd;
}

/** A single sponsored placement rendered inside the dashboard feed. */
const AdSlot: React.FC<Props> = ({ ad }) => {
  const { user } = useAppContext();
  const ref = useRef<HTMLDivElement>(null);
  const userId = (user as any)?.id || null;

  useEffect(() => {
    const el = ref.current;
    if (!el || !ad.media_url) return;
    const key = `ad-imp:${ad.id}`;
    if (sessionStorage.getItem(key)) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          sessionStorage.setItem(key, "1");
          recordAdImpression(ad, userId);
          obs.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ad, userId]);

  if (!ad.media_url) return null;

  const body =
    ad.media_type === "video" ? (
      <video
        className="h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      >
        <source src={ad.media_url} />
      </video>
    ) : (
      <img src={ad.media_url} alt={ad.title || "Advertisement"} className="h-full w-full object-cover" />
    );

  const inner = (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-amber-400/60 bg-black">
      {body}
      <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
        Sponsored
      </span>
      {ad.title && (
        <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2 text-sm font-semibold text-white">
          {ad.title}
        </span>
      )}
    </div>
  );

  return (
    <div ref={ref} className="w-full">
      {ad.link_url ? (
        <a
          href={ad.link_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
          onClick={() =>
            recordAdClick(ad, (user as any)?.id || null, (user as any)?.username || null)
          }
        >
          {inner}
        </a>
      ) : (
        inner
      )}
    </div>
  );
};

export default AdSlot;
