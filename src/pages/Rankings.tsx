import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import {
  Trophy,
  Medal,
  Award,
  Star,
  MapPin,
  User,
  DollarSign,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMobileLayout } from "@/hooks/use-mobile";
import { getRatingSeasonYear } from "@/lib/timeUtils";

interface RatingData {
  user_id: string;
  rating: number;
}

interface UserData {
  id: string;
  username: string;
  profile_photo: string | null;
  city: string | null;
  state: string | null;
  user_type: string;
}

interface RankedUser {
  id: string;
  username: string;
  profile_photo: string | null;
  city: string | null;
  state: string | null;
  user_type: string;
  total_score: number;
  rating_count: number;
  rank: number;
}

const PAGE_SIZE = 20;

const getPrizeForRank = (rank: number): number | null => {
  if (rank === 1) return 3000;
  if (rank === 2) return 1500;
  if (rank === 3) return 750;
  if (rank >= 4 && rank <= 10) return 200;
  if (rank >= 11 && rank <= 20) return 150;
  return null;
};

const Rankings: React.FC = () => {
  const [rankings, setRankings] = useState<RankedUser[]>([]);
  const [displayRankings, setDisplayRankings] = useState<RankedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const navigate = useNavigate();
  const { isMobile, getContainerClasses, getPaddingClasses } =
    useMobileLayout();

  useEffect(() => {
    fetchRankings();
  }, []);

  useEffect(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) {
      setDisplayRankings(rankings);
    } else {
      setDisplayRankings(
        rankings.filter((user) =>
          user.username.toLowerCase().includes(normalized)
        )
      );
    }
    setPage(0);
  }, [searchQuery, rankings]);

  const fetchRankings = async () => {
    try {
      setLoading(true);
      const seasonYear = getRatingSeasonYear();

      const { data: ratingsData, error: ratingsError } = await supabase
        .from("ratings")
        .select("user_id, rating")
        .eq("year", seasonYear);

      if (ratingsError) {
        console.error("Error fetching ratings:", ratingsError);
        return;
      }

      const { data: usersData, error: usersError } = await supabase
        .from("public_user_profiles")
        .select("id, username, profile_photo, city, state, user_type")
        .in("user_type", ["stripper", "exotic"]);

      if (usersError) {
        console.error("Error fetching users:", usersError);
        return;
      }

      if (ratingsData && usersData) {
        const userScores: { [userId: string]: RankedUser } = {};

        (usersData as UserData[]).forEach((user) => {
          userScores[user.id] = {
            id: user.id,
            username: user.username,
            profile_photo: user.profile_photo,
            city: user.city,
            state: user.state,
            user_type: user.user_type,
            total_score: 0,
            rating_count: 0,
            rank: 0,
          };
        });

        (ratingsData as RatingData[]).forEach((rating) => {
          if (userScores[rating.user_id]) {
            userScores[rating.user_id].total_score += rating.rating;
            userScores[rating.user_id].rating_count += 1;
          }
        });

        let rankedUsers = Object.values(userScores)
          .filter((user) => user.rating_count > 0)
          .sort((a, b) => b.total_score - a.total_score);

        rankedUsers.forEach((user, index) => {
          user.rank = index + 1;
        });

        setRankings(rankedUsers);
        setDisplayRankings(rankedUsers);
        setPage(0);
      }
    } catch (error) {
      console.error("Error fetching rankings:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />;
      case 2:
        return <Medal className="w-8 h-8 text-gray-300" />;
      case 3:
        return <Award className="w-8 h-8 text-amber-600" />;
      default:
        return <Star className="w-6 h-6 text-gray-400" />;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-400 to-yellow-600 shadow-[0_0_20px_rgba(250,204,21,0.5)]";
      case 2:
        return "bg-gradient-to-r from-gray-300 to-gray-500";
      case 3:
        return "bg-gradient-to-r from-amber-500 to-amber-700";
      default:
        return "bg-gradient-to-r from-purple-500 to-pink-600";
    }
  };

  const pageCount = Math.max(
    1,
    Math.ceil(displayRankings.length / PAGE_SIZE)
  );
  const pagedRankings = displayRankings.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE
  );
  const isAfterFirstPage = page > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading rankings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className={getContainerClasses("max-w-6xl mx-auto px-4 py-8")}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4 px-5 py-2 rounded-full border border-yellow-400/40 bg-yellow-400/10 backdrop-blur animate-pulse">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-300">
              Live Season Competition
            </span>
            <Sparkles className="w-4 h-4 text-yellow-400" />
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(250,204,21,0.35)]">
            🏆 {getRatingSeasonYear()} RANKINGS 🏆
          </h1>
          <p className="text-gray-300 text-lg whitespace-pre-line">
            Top performers ranked by total rating scores
            {"\n"}Money will be disbursed at the Malibu Mansion Party
          </p>

          {/* Prize structure banner */}
          <div className="mt-8 mx-auto max-w-3xl grid grid-cols-2 sm:grid-cols-5 gap-3 px-2">
            {[
              { label: "#1", prize: 3000, highlight: true },
              { label: "#2", prize: 1500, highlight: true },
              { label: "#3", prize: 750, highlight: true },
              { label: "#4–#10", prize: 200, highlight: false },
              { label: "#11–#20", prize: 150, highlight: false },
            ].map((p) => (
              <div
                key={p.label}
                className={`rounded-xl border px-3 py-3 text-center backdrop-blur transition-transform hover:scale-105 ${
                  p.highlight
                    ? "border-yellow-400/60 bg-yellow-400/10 shadow-[0_0_18px_rgba(250,204,21,0.25)]"
                    : "border-white/15 bg-white/5"
                }`}
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                  {p.label}
                </div>
                <div
                  className={`mt-1 text-lg font-extrabold ${
                    p.highlight ? "text-yellow-400" : "text-white"
                  }`}
                >
                  ${p.prize.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Username Search */}
        <div className="max-w-md mx-auto mb-8 px-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/10 border-white/20 text-white placeholder:text-gray-400 rounded-xl focus:border-yellow-400 focus:ring-yellow-400"
            />
          </div>
        </div>

        {/* Separator on pages after the top 20 */}
        {isAfterFirstPage && rankings.length > 0 && (
          <div className="mb-8 px-4">
            <div className="flex items-center gap-4 max-w-3xl mx-auto">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent" />
              <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-yellow-400/50 bg-yellow-400/10">
                <DollarSign className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-bold uppercase tracking-wider text-yellow-300">
                  Get to #20 for Cash Prize
                </span>
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent" />
            </div>
          </div>
        )}

        {/* Rankings List */}
        {rankings.length === 0 ? (
          <Card
            className={`bg-white/10 backdrop-blur border-white/20 ${
              isMobile ? "mx-4" : "max-w-md mx-auto"
            }`}
          >
            <CardContent className={`${getPaddingClasses("p-8")} text-center`}>
              <h3 className="text-xl font-bold text-yellow-400 mb-4">
                No Rankings Yet
              </h3>
              <p className="text-gray-300 mb-4">
                No ratings have been submitted for {getRatingSeasonYear()} yet.
              </p>
              <Button
                onClick={() => navigate("/rate-girls")}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
              >
                Start Rating
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className={`space-y-4 ${isMobile ? "px-4" : ""}`}>
            {pagedRankings.map((user) => {
              const prize = getPrizeForRank(user.rank);
              return (
                <Card
                  key={user.id}
                  className={`
                    bg-white/10 backdrop-blur border-white/20 hover:bg-white/20 
                    transition-all duration-300 overflow-hidden hover:scale-[1.01]
                    ${
                      user.rank <= 3
                        ? "border-2 border-yellow-400/50 shadow-lg shadow-yellow-400/10"
                        : ""
                    }
                    ${isMobile ? "rounded-none mx-0" : ""}
                  `}
                >
                  <CardContent className={getPaddingClasses("p-4 sm:p-6")}>
                    <div className="flex items-center gap-3 sm:gap-6">
                      {/* Rank */}
                      <div className="flex-shrink-0 text-center">
                        <div
                          className={`
                          w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center
                          ${getRankColor(user.rank)}
                        `}
                        >
                          {getRankIcon(user.rank)}
                        </div>
                        <div className="mt-1 sm:mt-2 font-bold text-sm sm:text-lg text-yellow-400">
                          #{user.rank}
                        </div>
                      </div>

                      {/* User Info */}
                      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                        <img
                          src={user.profile_photo || "/placeholder.svg"}
                          alt={user.username}
                          className="w-12 h-12 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-yellow-400 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-2xl font-bold text-yellow-400 mb-1 sm:mb-2 truncate">
                            @{user.username}
                          </h3>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-gray-300 text-xs sm:text-sm">
                            <div className="flex items-center gap-1">
                              <User size={12} />
                              <span className="capitalize">{user.user_type}</span>
                            </div>
                            {user.city && user.state && (
                              <div className="flex items-center gap-1 min-w-0">
                                <MapPin size={12} className="flex-shrink-0" />
                                <span className="truncate">
                                  {user.city}, {user.state}
                                </span>
                              </div>
                            )}
                          </div>
                          {/* Stats + prize inline on mobile */}
                          <div className="sm:hidden mt-1 flex items-baseline gap-2 flex-wrap">
                            <span className="text-lg font-bold text-yellow-400">
                              {user.total_score.toLocaleString()}
                            </span>
                            <span className="text-gray-300 text-xs">pts</span>
                            <span className="text-gray-400 text-xs">
                              · {user.rating_count} ratings
                            </span>
                            {prize !== null && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-green-500/20 border border-green-400/40 text-green-300 text-xs font-bold">
                                <DollarSign className="w-3 h-3" />
                                {prize.toLocaleString()} Prize
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Stats + prize (desktop) */}
                      <div className="hidden sm:block text-right flex-shrink-0">
                        <div className="text-3xl font-bold text-yellow-400 mb-1">
                          {user.total_score.toLocaleString()}
                        </div>
                        <div className="text-gray-300 text-sm">Total Score</div>
                        <div className="text-gray-400 text-xs mt-1">
                          {user.rating_count} ratings
                        </div>
                        {prize !== null && (
                          <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/20 border border-green-400/40 text-green-300 text-sm font-bold">
                            <DollarSign className="w-4 h-4" />
                            {prize.toLocaleString()} Cash Prize
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {rankings.length > PAGE_SIZE && (
          <div className="mt-10 flex items-center justify-center gap-4 px-4">
            <Button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="bg-white/10 text-white hover:bg-white/20 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            <span className="text-sm text-gray-300 font-semibold">
              Page {page + 1} of {pageCount}
            </span>
            <Button
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={page >= pageCount - 1}
              className="bg-white/10 text-white hover:bg-white/20 disabled:opacity-40"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Back to Rating Button */}
        <div className={`text-center mt-12 ${isMobile ? "px-4" : ""}`}>
          <Button
            onClick={() => navigate("/rate-girls")}
            className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black hover:from-yellow-500 hover:to-yellow-600 px-8 py-4 text-lg font-semibold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            Rate More Performers
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Rankings;
