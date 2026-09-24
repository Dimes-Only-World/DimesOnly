import React from "react";
import { DashboardAd, recordAdClick } from "@/lib/dashboardAds";
import { useAppContext } from "@/contexts/AppContext";

interface Props {
  ad: DashboardAd;
}

/** A single sponsored placement rendered inside the dashboard feed. */
const AdSlot: React.FC<Props> = ({ ad }) => {
  const { user } = useAppContext();
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
    <div className="my-6 w-full">
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
