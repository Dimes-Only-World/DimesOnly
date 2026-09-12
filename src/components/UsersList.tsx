import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Gem, Star } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getRatingSeasonYear } from "@/lib/timeUtils";
import defaultAvatar from "@/assets/default-avatar.png.asset.json";

type RateFilter = "all" | "rated" | "not-rated";

interface User {
  id: string;
  username: string;
  profile_photo: string;
  city: string;
  state: string;
  user_type: string;
  ratingCount: number;
  myRating: number | null;
}

interface UsersListProps {
  searchName: string;
  searchCity: string;
  searchState: string;
  onUserSelect: (user: User) => void;
  actionType: "tip" | "rate";
  noDataMessage?: string;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
  onImageClick?: (
    imageUrl: string,
    username: string,
    event: React.MouseEvent
  ) => void;
  rateFilter?: RateFilter;
  currentUserId?: string | null;
  usePersonalRatings?: boolean;
}

const UsersList: React.FC<UsersListProps> = ({
  searchName,
  searchCity,
  searchState,
  onUserSelect,
  actionType,
  noDataMessage,
  orderBy = "username",
  orderDirection = "asc",
  onImageClick,
  rateFilter = "all",
  currentUserId = null,
  usePersonalRatings = false,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, [orderBy, orderDirection, currentUserId, usePersonalRatings]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Use public_user_profiles view to bypass RLS restrictions
      const { data: usersData, error: usersError } = await supabase
        .from("public_user_profiles")
        .select("id, username, profile_photo, city, state, user_type")
        .in("user_type", ["stripper", "exotic"])
        .order(orderBy, { ascending: orderDirection === "asc" });

      if (usersError) throw usersError;

      const mappedUsers =
        (usersData || []).map((user) => ({
          id: String(user.id),
          username: String(user.username),
          profile_photo: String(user.profile_photo || ""),
          city: String(user.city || ""),
          state: String(user.state || ""),
          user_type: String(user.user_type),
          ratingCount: 0,
          myRating: null,
        })) ?? [];

      if (mappedUsers.length === 0) {
        setUsers(mappedUsers);
        return;
      }

      const performerIds = mappedUsers.map((user) => user.id);

      const seasonYear = getRatingSeasonYear();

      const { data: ratingsData, error: ratingsError } = await supabase
        .from("ratings")
        .select("user_id")
        .in("user_id", performerIds)
        .eq("year", seasonYear);

      if (ratingsError) throw ratingsError;

      const ratingCounts = (ratingsData || []).reduce<Record<string, number>>(
        (acc, rating) => {
          const key = String(rating.user_id);
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        },
        {}
      );

      let personalRatings: Record<string, number> = {};
      if (usePersonalRatings && currentUserId) {
        const { data: myRatingsData, error: myRatingsError } = await supabase
          .from("ratings")
          .select("user_id, rating")
          .eq("rater_id", currentUserId)
          .in("user_id", performerIds)
          .eq("year", seasonYear);

        if (myRatingsError) throw myRatingsError;

        personalRatings = (myRatingsData || []).reduce<Record<string, number>>(
          (acc, row) => {
            const key = String(row.user_id);
            acc[key] = Number(row.rating);
            return acc;
          },
          {}
        );
      }

      const usersWithCounts = mappedUsers.map((user) => ({
        ...user,
        ratingCount: ratingCounts[user.id] || 0,
        myRating: personalRatings[user.id] ?? null,
      }));

      setUsers(usersWithCounts);
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const nameMatch =
        !searchName ||
        user.username.toLowerCase().includes(searchName.toLowerCase());
      const cityMatch =
        !searchCity ||
        (user.city &&
          user.city.toLowerCase().includes(searchCity.toLowerCase()));
      const stateMatch =
        !searchState ||
        (user.state &&
          user.state.toLowerCase().includes(searchState.toLowerCase()));

      if (!nameMatch || !cityMatch || !stateMatch) {
        return false;
      }

      const hasPersonalRating = user.myRating !== null;
      const hasAnyRating = user.ratingCount > 0;

      if (rateFilter === "rated") {
        return usePersonalRatings ? hasPersonalRating : hasAnyRating;
      }
      if (rateFilter === "not-rated") {
        return usePersonalRatings ? !hasPersonalRating : !hasAnyRating;
      }
      return true;
    });
  }, [users, searchName, searchCity, searchState, rateFilter, usePersonalRatings]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 animate-pulse"
          >
            <div className="aspect-[3/4] w-full bg-white/10" />
            <div className="space-y-2 p-4">
              <div className="h-4 w-2/3 rounded bg-white/10" />
              <div className="h-3 w-1/2 rounded bg-white/10" />
              <div className="h-9 w-full rounded-xl bg-white/10" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (filteredUsers.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center backdrop-blur">
        <h3 className="mb-2 text-xl font-bold text-white">
          {noDataMessage || "No users found"}
        </h3>
        <p className="text-gray-400">
          {searchName || searchCity || searchState
            ? "Try adjusting your search criteria."
            : "Check back later for updates."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
      {filteredUsers.map((user) => {
        const photo = user.profile_photo || defaultAvatar.url;
        return (
          <div
            key={user.id}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-fuchsia-500/50 hover:shadow-[0_20px_50px_-20px_rgba(233,22,209,0.45)]"
          >
            <div className="relative aspect-[3/4] w-full overflow-hidden">
              <img
                src={photo}
                alt={user.username}
                loading="lazy"
                onError={(e) => {
                  if (e.currentTarget.src !== defaultAvatar.url) {
                    e.currentTarget.src = defaultAvatar.url;
                  }
                }}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-pointer"
                onClick={
                  onImageClick
                    ? (e) => onImageClick(photo, user.username, e)
                    : undefined
                }
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute right-2 top-2">
                <span className="rounded-full bg-fuchsia-600/90 px-2.5 py-1 text-[11px] font-semibold capitalize text-white shadow-lg">
                  {user.user_type}
                </span>
              </div>
              {actionType !== "tip" && (
                <div className="absolute left-2 top-2">
                  <span className="rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white">
                    {usePersonalRatings
                      ? user.myRating !== null
                        ? `Your Rating ${user.myRating}`
                        : "Not Rated"
                      : `Rated ${user.ratingCount}`}
                  </span>
                </div>
              )}
            </div>

            <div className="p-3 sm:p-4">
              <h3 className="truncate text-base font-bold text-white sm:text-lg">
                @{user.username}
              </h3>

              {(user.city || user.state) && (
                <div className="mb-3 mt-1 flex items-center text-xs text-gray-400 sm:text-sm">
                  <MapPin size={13} className="mr-1 shrink-0" />
                  <span className="truncate">
                    {user.city}
                    {user.city && user.state ? ", " : ""}
                    {user.state}
                  </span>
                </div>
              )}

              <Button
                onClick={() => onUserSelect(user)}
                className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-semibold text-white shadow-[0_8px_24px_-8px_rgba(219,39,119,0.6)] transition-all hover:from-purple-500 hover:to-pink-500 hover:shadow-[0_12px_32px_-8px_rgba(219,39,119,0.8)]"
              >
                {actionType === "tip" ? (
                  <>
                    <Gem className="mr-2 h-4 w-4" /> Tip Now
                  </>
                ) : (
                  <>
                    <Star className="mr-2 h-4 w-4" /> Rate Now
                  </>
                )}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default UsersList;