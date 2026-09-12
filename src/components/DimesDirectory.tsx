import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search, User, Crown, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import DirectMessageModal from "./DirectMessageModal";
import BannerVideo from "./BannerVideo";
import { usePageVideo } from "@/hooks/usePageVideo";
import useOnlinePresence from "@/hooks/useOnlinePresence";
import defaultAvatar from "@/assets/default-avatar.png.asset.json";


interface DimeProfile {
  id: string;
  username: string;
  profile_photo: string | null;
  user_type: string;
  gender: string;
  city: string;
  state: string;
  membership_tier: string | null;
  membership_type: string | null;
  diamond_plus_active: boolean;
  silver_plus_active: boolean;
  rank_number: number | null;
  user_rank: number | null;
  ratings_count: number;
  content_free_count: number;
  content_nude_count: number;
  content_xrated_count: number;
}

const getMembershipLabel = (profile: DimeProfile) => {
  const tier = (profile.membership_tier ?? "").toLowerCase();
  const type = (profile.membership_type ?? "").toLowerCase();

  if (
    profile.diamond_plus_active ||
    tier === "diamond_plus" ||
    type === "diamond_plus"
  ) {
    return "Diamond Plus Member";
  }

  if (tier === "diamond" || type === "diamond") {
    return "Diamond Member";
  }

  if (
    profile.silver_plus_active ||
    tier === "silver_plus" ||
    type === "silver_plus" ||
    tier === "silver" ||
    type === "silver"
  ) {
    return "Silver Plus Member";
  }

  if (tier === "gold" || type === "gold") return "Gold Member";
  if (tier === "silver") return "Silver Member";
  return "Diamond Member";
};

const getRankText = (profile: DimeProfile) => {
  if (profile.rank_number && profile.rank_number > 0) return `#${profile.rank_number}`;
  if (profile.user_rank && profile.user_rank > 0) return `#${profile.user_rank}`;
  return "Unranked";
};

const DimesDirectory: React.FC = () => {
  const [profiles, setProfiles] = useState<DimeProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<DimeProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { videoUrl: dimesVideoUrl } = usePageVideo("dimes_directory_page");
  const [messageRecipient, setMessageRecipient] = useState<DimeProfile | null>(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const onlineUsers = useOnlinePresence(true);

  const isOnline = (username: string) => onlineUsers.has(username.trim().toLowerCase());

  const visibleProfiles = useMemo(
    () => (onlineOnly ? filteredProfiles.filter((p) => isOnline(p.username)) : filteredProfiles),
    [filteredProfiles, onlineOnly, onlineUsers]
  );


  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    filterProfiles();
  }, [searchTerm, profiles]);


  const fetchProfiles = async () => {
    try {
      // Use public_user_profiles view to bypass RLS restrictions
      const { data: usersData, error: usersError } = await supabase
        .from("public_user_profiles")
        .select(
          `
            id,
            username,
            profile_photo,
            user_type,
            gender,
            city,
            state,
            membership_tier,
            membership_type,
            diamond_plus_active,
            silver_plus_active,
            rank_number,
            user_rank
          `
        )
        .not("user_type", "is", null)
        .order("created_at", { ascending: false });

      if (usersError) throw usersError;

      const performerRows =
        usersData
          ?.filter(
            (user) =>
              String(user.gender || "").toLowerCase() === "female" &&
              ["stripper", "exotic"].includes(String(user.user_type || "").toLowerCase())
          ) ?? [];

      const userIds = performerRows.map((user) => user.id as string);

      const ratingCountMap = new Map<string, number>();
      const computedRanks = new Map<string, number>();

      if (userIds.length > 0) {
        const { data: ratingCountData, error: ratingCountError } = await supabase
          .from("ratings")
          .select("user_id")
          .in("user_id", userIds);

        if (ratingCountError) throw ratingCountError;

        const ratingCountRows = (ratingCountData ?? []) as { user_id: string }[];
        ratingCountRows.forEach((row) => {
          ratingCountMap.set(row.user_id, (ratingCountMap.get(row.user_id) ?? 0) + 1);
        });

        const currentYear = new Date().getFullYear();
        const { data: yearlyRatings, error: yearlyRatingsError } = await supabase
          .from("ratings")
          .select("user_id, rating, year")
          .eq("year", currentYear)
          .in("user_id", userIds);

        if (yearlyRatingsError) throw yearlyRatingsError;

        const scoreMap = new Map<string, { total: number; count: number }>();
        const yearlyRatingRows = (yearlyRatings ?? []) as {
          user_id: string;
          rating: number;
          year: number | null;
        }[];

        yearlyRatingRows.forEach((row) => {
          const entry = scoreMap.get(row.user_id) || { total: 0, count: 0 };
          entry.total += Number(row.rating);
          entry.count += 1;
          scoreMap.set(row.user_id, entry);
        });

        Array.from(scoreMap.entries())
          .filter(([, value]) => value.count > 0)
          .sort((a, b) => b[1].total - a[1].total)
          .forEach(([userId], index) => {
            computedRanks.set(userId, index + 1);
          });
      }

      const femaleUsers = performerRows.map((user) => {
        const id = user.id as string;
        const computedRank = computedRanks.get(id);
        const existingRank =
          (user.rank_number as number | null) ?? (user.user_rank as number | null) ?? null;

        return {
          id,
          username: user.username as string,
          profile_photo: (user.profile_photo as string) ?? null,
          user_type: user.user_type as string,
          gender: user.gender as string,
          city: (user.city as string) ?? "",
          state: (user.state as string) ?? "",
          membership_tier: (user.membership_tier as string) ?? null,
          membership_type: (user.membership_type as string) ?? null,
          diamond_plus_active: Boolean(user.diamond_plus_active),
          silver_plus_active: Boolean(user.silver_plus_active),
          rank_number: computedRank ?? existingRank,
          user_rank: computedRank ?? existingRank,
          ratings_count: ratingCountMap.get(id) ?? 0,
          content_free_count: 0,
          content_nude_count: 0,
          content_xrated_count: 0,
        };
      });

      const mediaCounts = new Map<
        string,
        { free: number; nude: number; xrated: number }
      >();

      // Fetch media counts using public-data edge function
      if (femaleUsers.length > 0) {
        try {
          const { data: mediaResponse, error: mediaError } = await supabase.functions.invoke('public-data', {
            body: { 
              action: 'fetchMediaCounts', 
              userIds: femaleUsers.map((user) => user.id)
            }
          });

          if (!mediaError && mediaResponse?.data) {
            const mediaRows = mediaResponse.data as {
              user_id: string;
              content_tier: string | null;
              is_nude: boolean | null;
              is_xrated: boolean | null;
            }[];

            mediaRows.forEach((row) => {
              const entry =
                mediaCounts.get(row.user_id) || { free: 0, nude: 0, xrated: 0 };
              const tier = (row.content_tier ?? "").toLowerCase();

              if (tier === "free") {
                entry.free += 1;
              } else if (tier === "silver") {
                entry.nude += 1;
              } else if (tier === "gold") {
                entry.xrated += 1;
              } else {
                if (row.is_nude) entry.nude += 1;
                if (row.is_xrated) entry.xrated += 1;
              }

              mediaCounts.set(row.user_id, entry);
            });
          }
        } catch (mediaErr) {
          console.warn("Could not fetch media counts:", mediaErr);
        }
      }

      const enriched = femaleUsers.map((profile) => {
        const media = mediaCounts.get(profile.id);
        return {
          ...profile,
          content_free_count: media?.free ?? 0,
          content_nude_count: media?.nude ?? 0,
          content_xrated_count: media?.xrated ?? 0,
        };
      });

      setProfiles(enriched);
    } catch (error) {
      console.error("Error fetching profiles:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterProfiles = () => {
    if (!searchTerm.trim()) {
      setFilteredProfiles(profiles);
      return;
    }

    const lower = searchTerm.toLowerCase();
    const filtered = profiles.filter((profile) => {
      const location = `${profile.city} ${profile.state}`.toLowerCase();
      return profile.username.toLowerCase().includes(lower) || location.includes(lower);
    });

    setFilteredProfiles(filtered);
  };

  const handleProfileClick = (username: string) => {
    navigate(`/profile/${username}`);
  };

  const handleZoomNavigate = (
    e: React.MouseEvent,
    profile: DimeProfile,
    imgEl: HTMLImageElement | null
  ) => {
    e.stopPropagation();
    const src = profile.profile_photo || defaultAvatar.url;
    const rect = imgEl?.getBoundingClientRect();
    if (!rect) {
      handleProfileClick(profile.username);
      return;
    }
    setZoom({
      src,
      username: profile.username,
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
    });
    window.setTimeout(() => {
      navigate(`/profile/${profile.username}`);
    }, 720);
  };

    const handleMessageClick = (profile: DimeProfile) => {
    setMessageRecipient(profile);
    setIsMessageModalOpen(true);
  };

  const closeMessageModal = () => {
    setIsMessageModalOpen(false);
    setMessageRecipient(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#E916D1]/30 border-t-[#E916D1]" />
          <div className="text-sm uppercase tracking-[0.3em] text-slate-400">Loading Dimes</div>
        </div>
      </div>
    );
  }

  const ranked = [...visibleProfiles].sort((a, b) => {
    const ra = a.rank_number ?? 9999;
    const rb = b.rank_number ?? 9999;
    return ra - rb;
  });

  return (
    <div className="space-y-8">
      {/* Video Banner */}
      {dimesVideoUrl && (
        <BannerVideo src={dimesVideoUrl} className="rounded-2xl" />
      )}

      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0B0611] via-[#170A22] to-[#0B0611] px-6 py-12 md:px-12 md:py-16">
        <div className="pointer-events-none absolute -top-32 -right-24 h-72 w-72 rounded-full bg-[#E916D1]/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-yellow-400/10 blur-3xl" />

        <div className="relative text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E916D1]/40 bg-[#E916D1]/10 px-4 py-1.5 backdrop-blur">
            <Crown className="h-4 w-4 text-yellow-400" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#F5A3EA]">
              The Official Dimes Directory
            </span>
          </div>

          <h1 className="mt-5 text-4xl font-black uppercase leading-[0.95] tracking-tight text-white md:text-6xl">
            Browse <span className="bg-gradient-to-r from-[#E916D1] via-[#FF5FD1] to-yellow-300 bg-clip-text text-transparent">Dimes</span>
          </h1>
          <div className="mx-auto mt-4 h-[3px] w-28 rounded-full bg-gradient-to-r from-transparent via-[#E916D1] to-transparent" />

          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-slate-300 md:text-base">
            Search and discover the Dimes profiles.
          </p>
          <p className="mx-auto mt-3 inline-flex items-center rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-xs font-medium text-yellow-300">
            Full content will be available when the app is released
          </p>

          <div className="mx-auto mt-8 flex max-w-2xl flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Search by username, city, or state..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11 border-white/15 bg-slate-900/60 pl-10 text-white placeholder:text-slate-400 focus-visible:ring-[#E916D1]"
              />
            </div>

            <div className="flex items-center justify-center gap-3 sm:border-l sm:border-white/10 sm:pl-4">
              <Switch id="online-only" checked={onlineOnly} onCheckedChange={setOnlineOnly} />
              <Label htmlFor="online-only" className="cursor-pointer whitespace-nowrap text-sm text-slate-200">
                Online only
              </Label>
            </div>
          </div>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-slate-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            {visibleProfiles.length} profile{visibleProfiles.length !== 1 ? "s" : ""} found
          </div>
        </div>
      </section>

      {ranked.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ranked.map((profile) => {
            const location =
              profile.city && profile.state
                ? `${profile.city}, ${profile.state}`
                : profile.city || profile.state || "Location not specified";

            const membership = getMembershipLabel(profile);
            const rankText = getRankText(profile);
            const rank = profile.rank_number ?? 0;
            const isTop20 = rank >= 1 && rank <= 20;
            const online = isOnline(profile.username);

            return (
              <article
                key={profile.id}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-[#100A17] shadow-[0_10px_40px_-20px_rgba(233,22,209,0.6)] transition-all duration-300 hover:-translate-y-1 hover:border-[#E916D1]/50 hover:shadow-[0_25px_60px_-25px_rgba(233,22,209,0.85)]"
                onClick={(e) =>
                  handleZoomNavigate(
                    e,
                    profile,
                    (e.currentTarget.querySelector("img") as HTMLImageElement) ?? null
                  )
                }
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-slate-900">
                  <img
                    src={profile.profile_photo || defaultAvatar.url}
                    alt={`${profile.username} profile photo`}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (img.src !== window.location.origin + defaultAvatar.url) {
                        img.src = defaultAvatar.url;
                      }
                    }}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0B0611] via-[#0B0611]/25 to-transparent" />

                  {isTop20 && (
                    <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-orange-400/50 bg-black/60 px-2.5 py-1 backdrop-blur">
                      <span className="dimes-flame" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                      </span>
                      <span className="text-xs font-black tracking-wide text-orange-200">
                        #{rank}
                      </span>
                    </div>
                  )}

                  <span
                    title={online ? "Online now" : "Offline"}
                    className={`absolute right-3 top-3 flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider backdrop-blur ${
                      online
                        ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-300"
                        : "border-white/15 bg-black/50 text-slate-300"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        online ? "animate-pulse bg-emerald-400" : "bg-slate-500"
                      }`}
                    />
                    {online ? "Online" : "Offline"}
                  </span>

                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <h3 className="truncate text-lg font-extrabold text-white">@{profile.username}</h3>
                    <p className="truncate text-xs text-slate-300">{location}</p>
                  </div>
                </div>

                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge className="border-0 bg-[#E916D1]/15 text-[11px] capitalize text-[#F5A3EA]">
                      {profile.user_type}
                    </Badge>
                    <Badge className="border-0 bg-yellow-400/15 text-[11px] text-yellow-300">
                      {membership}
                    </Badge>
                    <Badge className="border-0 bg-white/10 text-[11px] text-slate-300">
                      Rank {rankText}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-y-1.5 rounded-xl border border-white/5 bg-white/5 p-3 text-[11px] text-slate-300">
                    <span>Rated: <strong className="text-white">{profile.ratings_count}</strong></span>
                    <span>
                      Free:{" "}
                      <strong className={profile.content_free_count > 0 ? "text-emerald-400" : "text-slate-500"}>
                        {profile.content_free_count > 0 ? "Yes" : "No"}
                      </strong>
                    </span>
                    <span>
                      Nude:{" "}
                      <strong className={profile.content_nude_count > 0 ? "text-emerald-400" : "text-slate-500"}>
                        {profile.content_nude_count > 0 ? "Yes" : "No"}
                      </strong>
                    </span>
                    <span>
                      X-Rated:{" "}
                      <strong className={profile.content_xrated_count > 0 ? "text-emerald-400" : "text-slate-500"}>
                        {profile.content_xrated_count > 0 ? "Yes" : "No"}
                      </strong>
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-gradient-to-r from-[#E916D1] to-[#FF5FD1] text-white hover:opacity-90"
                      onClick={(e) =>
                        handleZoomNavigate(
                          e,
                          profile,
                          (e.currentTarget.closest("article")?.querySelector("img") as HTMLImageElement) ?? null
                        )
                      }
                    >
                      <User className="mr-2 h-4 w-4" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/15 bg-transparent text-slate-200 hover:bg-white/10 hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMessageClick(profile);
                      }}
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 py-16 text-center">
          <User className="mx-auto mb-4 h-16 w-16 text-slate-600" />
          <h3 className="mb-2 text-xl font-semibold text-white">No profiles found</h3>
          <p className="text-slate-400">
            {searchTerm ? "Try adjusting your search terms" : "No dimes profiles available"}
          </p>
        </div>
      )}

      {zoom && (
        <div className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-sm dimes-zoom-fade">
          <img
            src={zoom.src}
            alt={`${zoom.username} profile photo`}
            className="dimes-zoom-img absolute object-contain"
            style={
              {
                top: zoom.rect.top,
                left: zoom.rect.left,
                width: zoom.rect.width,
                height: zoom.rect.height,
              } as React.CSSProperties
            }
          />
        </div>
      )}

        <DirectMessageModal
        isOpen={isMessageModalOpen}
        onClose={closeMessageModal}
        recipientUsername={messageRecipient?.username ?? null}
      />
    </div>
  );
};
export default DimesDirectory;
