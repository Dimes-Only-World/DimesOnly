import React, { useState, useEffect } from "react";
import { usePageVideo } from "@/hooks/usePageVideo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/contexts/AppContext";
import AuthGuard from "@/components/AuthGuard";
import ReferrerDisplay from "@/components/ReferrerDisplay";
import { normalizeRefParam } from "@/lib/utils";
import { Search, MapPin, User, Crown, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import BannerVideo from "@/components/BannerVideo";
import HomeProfileButton from "@/components/HomeProfileButton";
import defaultAvatar from "@/assets/default-avatar.png.asset.json";

interface Performer {
  id: string;
  username: string;
  profile_photo: string;
  city: string;
  state: string;
  user_type: "stripper" | "exotic";
  created_at?: string;
  rank: number | null;
}

const EventsDimes: React.FC = () => {
  const { user, loading: userLoading } = useAppContext();
  const navigate = useNavigate();
  const { videoUrl: eventsMaleVideoUrl } = usePageVideo("events_male_page");
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [performers, setPerformers] = useState<Performer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    username: "",
    city: "",
    state: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const performersPerPage = 30;

  // Get ref parameter from URL with proper decoding and normalization
  const refParam = normalizeRefParam(searchParams.get("ref"));

  // Check access control - allow male, female, normal users (not strippers/exotics)
  const allowedUserTypes = ["", "normal", "male", "female", "male_normal", "female_normal"];
  const canViewPage =
    !userLoading &&
    user &&
    (!user.userType || allowedUserTypes.includes(user.userType.toLowerCase()));

  useEffect(() => {
    if (canViewPage) {
      fetchPerformers();
    }
  }, [canViewPage]);

  const fetchPerformers = async () => {
    try {
      // Use public_user_profiles view to bypass RLS restrictions
      const { data, error } = await supabase
        .from("public_user_profiles")
        .select("id, username, profile_photo, city, state, user_type, created_at")
        .in("user_type", ["stripper", "exotic"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      const rows = (data as Omit<Performer, "rank">[]) || [];
      const userIds = rows.map((r) => r.id);
      const computedRanks = new Map<string, number>();

      if (userIds.length > 0) {
        const currentYear = new Date().getFullYear();
        const { data: yearlyRatings, error: yearlyRatingsError } = await supabase
          .from("ratings")
          .select("user_id, rating")
          .eq("year", currentYear)
          .in("user_id", userIds);

        if (!yearlyRatingsError && yearlyRatings) {
          const scoreMap = new Map<string, { total: number; count: number }>();
          (yearlyRatings as { user_id: string; rating: number }[]).forEach((row) => {
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
      }

      setPerformers(
        rows.map((row) => ({ ...row, rank: computedRanks.get(row.id) ?? null }))
      );
    } catch (error) {
      console.error("Error fetching performers:", error);
      toast({
        title: "Error",
        description: "Failed to fetch performers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredPerformers = performers.filter((performer) => {
    return (
      (filters.username === "" ||
        performer.username
          .toLowerCase()
          .includes(filters.username.toLowerCase())) &&
      (filters.city === "" ||
        performer.city?.toLowerCase().includes(filters.city.toLowerCase())) &&
      (filters.state === "" ||
        performer.state?.toLowerCase().includes(filters.state.toLowerCase()))
    );
  });

  const sortedPerformers = [...filteredPerformers].sort((a, b) => {
    const ra = a.rank ?? 9999;
    const rb = b.rank ?? 9999;
    return ra - rb;
  });

  const paginatedPerformers = sortedPerformers.slice(
    (currentPage - 1) * performersPerPage,
    currentPage * performersPerPage
  );
  const totalPages = Math.ceil(sortedPerformers.length / performersPerPage);

  const handleLetsGo = (performerUsername: string) => {
    // Navigate to events page with performer's username and ref parameter
    navigate(`/events?events=${performerUsername}&ref=${refParam}`);
  };

  const handleGoBack = () => {
    navigate(-1); // Go back to previous page
  };

  // Show loading state while user data is being fetched
  if (userLoading) {
    return (
      <AuthGuard>
        <div className="flex min-h-screen items-center justify-center bg-[#070409] px-4">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#E916D1]/30 border-t-[#E916D1]" />
            <div className="text-sm uppercase tracking-[0.3em] text-slate-400">Loading</div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (!canViewPage) {
    return (
      <AuthGuard>
        <div className="flex min-h-screen items-center justify-center bg-[#070409] px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#100A17] p-8 text-center shadow-[0_10px_40px_-20px_rgba(233,22,209,0.6)]">
            <h2 className="mb-4 text-2xl font-bold text-red-400">Access Restricted</h2>
            <p className="text-slate-300">
              This page is only available to normal users (not strippers or exotic dancers).
            </p>
            <Button
              onClick={handleGoBack}
              variant="outline"
              className="mt-6 border-white/15 bg-transparent text-slate-200 hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#070409] text-white">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(233,22,209,0.16),transparent_55%),radial-gradient(circle_at_80%_100%,rgba(250,204,21,0.08),transparent_55%)]" />

        {/* Video Banner */}
        {eventsMaleVideoUrl && (
          <div className="relative">
            <BannerVideo src={eventsMaleVideoUrl} />
          </div>
        )}

        <div className="relative mx-auto max-w-7xl space-y-8 px-4 py-8">
          <div className="flex justify-start">
            <HomeProfileButton />
          </div>

          {/* Hero Section */}
          <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0B0611] via-[#170A22] to-[#0B0611] px-6 py-12 md:px-12 md:py-16">
            <div className="pointer-events-none absolute -top-32 -right-24 h-72 w-72 rounded-full bg-[#E916D1]/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-yellow-400/10 blur-3xl" />

            <div className="relative text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#E916D1]/40 bg-[#E916D1]/10 px-4 py-1.5 backdrop-blur">
                <Crown className="h-4 w-4 text-yellow-400" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#F5A3EA]">
                  Exclusive Event Companions
                </span>
              </div>

              <h1 className="mt-5 text-4xl font-black uppercase leading-[0.95] tracking-tight text-white md:text-6xl">
                Choose Your{" "}
                <span className="bg-gradient-to-r from-[#E916D1] via-[#FF5FD1] to-yellow-300 bg-clip-text text-transparent">
                  Event Partner
                </span>
              </h1>
              <div className="mx-auto mt-4 h-[3px] w-28 rounded-full bg-gradient-to-r from-transparent via-[#E916D1] to-transparent" />

              <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-slate-300 md:text-base">
                Select a dime to attend events with. Your chosen event partner will be
                notified of the event(s) you attend.
              </p>

              {/* Referrer Display */}
              {refParam && refParam !== user?.username && (
                <div className="mt-6">
                  <ReferrerDisplay referrerUsername={refParam} />
                </div>
              )}

              {/* Filters */}
              <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="mb-3 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                  <Search className="h-3.5 w-3.5 text-[#E916D1]" />
                  Filter Event Partners
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Username"
                      value={filters.username}
                      onChange={(e) => {
                        setFilters((prev) => ({ ...prev, username: e.target.value }));
                        setCurrentPage(1);
                      }}
                      className="h-11 border-white/15 bg-slate-900/60 pl-10 text-white placeholder:text-slate-400 focus-visible:ring-[#E916D1]"
                    />
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="City"
                      value={filters.city}
                      onChange={(e) => {
                        setFilters((prev) => ({ ...prev, city: e.target.value }));
                        setCurrentPage(1);
                      }}
                      className="h-11 border-white/15 bg-slate-900/60 pl-10 text-white placeholder:text-slate-400 focus-visible:ring-[#E916D1]"
                    />
                  </div>
                  <Input
                    placeholder="State"
                    value={filters.state}
                    onChange={(e) => {
                      setFilters((prev) => ({ ...prev, state: e.target.value }));
                      setCurrentPage(1);
                    }}
                    className="h-11 border-white/15 bg-slate-900/60 text-white placeholder:text-slate-400 focus-visible:ring-[#E916D1]"
                  />
                </div>
              </div>

              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-slate-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                {sortedPerformers.length} partner{sortedPerformers.length !== 1 ? "s" : ""} found
              </div>
            </div>
          </section>

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#E916D1]/30 border-t-[#E916D1]" />
                <div className="text-sm uppercase tracking-[0.3em] text-slate-400">
                  Loading Partners
                </div>
              </div>
            </div>
          ) : sortedPerformers.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 py-16 text-center">
              <User className="mx-auto mb-4 h-16 w-16 text-slate-600" />
              <h3 className="mb-2 text-xl font-semibold text-white">No partners found</h3>
              <p className="mb-6 text-slate-400">Try adjusting your filters</p>
              <Button
                onClick={handleGoBack}
                variant="outline"
                className="border-white/15 bg-transparent text-slate-200 hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
            </div>
          ) : (
            <>
              {/* Performers Grid */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {paginatedPerformers.map((performer) => {
                  const rank = performer.rank ?? 0;
                  const isTop20 = rank >= 1 && rank <= 20;

                  return (
                    <article
                      key={performer.id}
                      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#100A17] shadow-[0_10px_40px_-20px_rgba(233,22,209,0.6)] transition-all duration-300 hover:-translate-y-1 hover:border-[#E916D1]/50 hover:shadow-[0_25px_60px_-25px_rgba(233,22,209,0.85)]"
                    >
                      <div className="relative aspect-[3/4] overflow-hidden bg-slate-900">
                        <img
                          src={performer.profile_photo || defaultAvatar.url}
                          alt={`${performer.username} profile photo`}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (target.src !== window.location.origin + defaultAvatar.url) {
                              target.src = defaultAvatar.url;
                            }
                          }}
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0B0611] via-[#0B0611]/25 to-transparent" />

                        {isTop20 && (
                          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-orange-400/60 bg-gradient-to-r from-black/80 to-orange-950/70 px-3 py-1.5 shadow-[0_0_20px_rgba(249,115,22,0.45)] backdrop-blur animate-pulse">
                            <span className="dimes-flame" aria-hidden="true">
                              <span />
                              <span />
                              <span />
                            </span>
                            <span className="text-sm font-black tracking-wide text-orange-100">
                              #{rank}
                            </span>
                          </div>
                        )}

                        <div className="absolute inset-x-0 bottom-0 p-4">
                          <h3 className="truncate text-lg font-extrabold text-white">
                            @{performer.username}
                          </h3>
                          {(performer.city || performer.state) && (
                            <p className="flex items-center gap-1 truncate text-xs text-slate-300">
                              <MapPin className="h-3 w-3 shrink-0" />
                              {performer.city && performer.state
                                ? `${performer.city}, ${performer.state}`
                                : performer.city || performer.state}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3 p-4">
                        <div className="flex flex-wrap gap-1.5">
                          <Badge className="border-0 bg-[#E916D1]/15 text-[11px] capitalize text-[#F5A3EA]">
                            {performer.user_type}
                          </Badge>
                          {isTop20 && (
                            <Badge className="border-0 bg-orange-400/15 text-[11px] text-orange-300">
                              Top 20 Ranked
                            </Badge>
                          )}
                        </div>

                        <Button
                          onClick={() => handleLetsGo(performer.username)}
                          className="w-full bg-gradient-to-r from-[#E916D1] to-[#FF5FD1] font-bold text-white transition-all duration-300 hover:opacity-90 hover:shadow-[0_0_25px_rgba(233,22,209,0.5)]"
                        >
                          LET&apos;S GO!
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur sm:flex-row">
                  <p className="text-center text-sm text-slate-300">
                    Showing {(currentPage - 1) * performersPerPage + 1} to{" "}
                    {Math.min(currentPage * performersPerPage, sortedPerformers.length)} of{" "}
                    {sortedPerformers.length} partners
                  </p>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      variant="outline"
                      className="border-white/15 bg-transparent text-slate-200 hover:bg-white/10 hover:text-white disabled:opacity-40"
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      variant="outline"
                      className="border-white/15 bg-transparent text-slate-200 hover:bg-white/10 hover:text-white disabled:opacity-40"
                    >
                      Next
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  );
};

export default EventsDimes;
