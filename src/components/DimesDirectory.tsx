import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, User, Crown, Mail } from "lucide-react";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

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
  return "Free Member";
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
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    filterProfiles();
  }, [searchTerm, profiles]);

  const fetchProfiles = async () => {
    try {
      const { data: usersData, error: usersError } = await supabase
        .from("users")
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

      if (femaleUsers.length > 0) {
        const { data: mediaData, error: mediaError } = await supabaseAdmin
          .from("user_media")
          .select("user_id, content_tier, is_nude, is_xrated, flagged")
          .in(
            "user_id",
            femaleUsers.map((user) => user.id)
          )
          .eq("flagged", false);

        if (!mediaError && mediaData) {
          const mediaRows = mediaData as {
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

  const handleMessageClick = (username: string) => {
    navigate(`/dashboard?tab=messages&to=${encodeURIComponent(username)}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading profiles...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Browse Dimes</h2>
        <p className="text-gray-600 mb-6">Search and discover dimes profiles</p>

        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search by username or city or state..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="text-center text-gray-600">
        {filteredProfiles.length} profile{filteredProfiles.length !== 1 ? "s" : ""} found
      </div>

      {filteredProfiles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProfiles.map((profile) => {
            const location =
              profile.city && profile.state
                ? `${profile.city}, ${profile.state}`
                : profile.city || profile.state || "Location not specified";

            const membership = getMembershipLabel(profile);
            const rankText = getRankText(profile);

            return (
              <Card
                key={profile.id}
                className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
                onClick={() => handleProfileClick(profile.username)}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                        <img
                          src={profile.profile_photo || "/placeholder.svg"}
                          alt={profile.username}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 space-y-2">
                        <div className="flex flex-col">
                          <h3 className="font-semibold text-lg">@{profile.username}</h3>
                          <p className="text-gray-600 text-sm">{location}</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary" className="text-xs capitalize">
                            {profile.gender}
                          </Badge>
                          <Badge variant="outline" className="text-xs flex items-center gap-1 capitalize">
                            <Crown className="w-3 h-3" />
                            {profile.user_type}
                          </Badge>
                          <Badge className="text-xs bg-amber-100 text-amber-700">
                            {membership}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-rose-600">Message Me</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-2 border-rose-500 text-rose-600 hover:bg-rose-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMessageClick(profile.username);
                          }}
                        >
                          <Mail className="w-4 h-4" />
                          Message
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-y-2 text-sm text-gray-700">
                        <span>
                          <strong className="font-semibold text-gray-900">Rated:</strong>{" "}
                          {profile.ratings_count}
                        </span>
                        <span>
                          <strong className="font-semibold text-gray-900">Ranked:</strong>{" "}
                          {rankText}
                        </span>
                        <span>
                          <strong className="font-semibold text-gray-900">Free Content:</strong>{" "}
                          {profile.content_free_count}
                        </span>
                        <span>
                          <strong className="font-semibold text-gray-900">Nude Content:</strong>{" "}
                          {profile.content_nude_count}
                        </span>
                        <span>
                          <strong className="font-semibold text-gray-900">X-Rated Content:</strong>{" "}
                          {profile.content_xrated_count}
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProfileClick(profile.username);
                      }}
                    >
                      <User className="w-4 h-4 mr-2" />
                      View Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No profiles found</h3>
          <p className="text-gray-600">
            {searchTerm ? "Try adjusting your search terms" : "No dimes profiles available"}
          </p>
        </div>
      )}
    </div>
  );
};
export default DimesDirectory;