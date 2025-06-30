import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface User {
  id: string;
  username: string;
  profile_photo: string;
  city: string;
  state: string;
  user_type: string;
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
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, [orderBy, orderDirection]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("users")
        .select("id, username, profile_photo, city, state, user_type")
        .in("user_type", ["stripper", "exotic"])
        .order(orderBy, { ascending: orderDirection === "asc" });

      if (error) throw error;
      setUsers(
        (data || []).map((user) => ({
          id: String(user.id),
          username: String(user.username),
          profile_photo: String(user.profile_photo || ""),
          city: String(user.city || ""),
          state: String(user.state || ""),
          user_type: String(user.user_type),
        }))
      );
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const nameMatch =
      !searchName ||
      user.username.toLowerCase().includes(searchName.toLowerCase());
    const cityMatch =
      !searchCity ||
      (user.city && user.city.toLowerCase().includes(searchCity.toLowerCase()));
    const stateMatch =
      !searchState ||
      (user.state &&
        user.state.toLowerCase().includes(searchState.toLowerCase()));
    return nameMatch && cityMatch && stateMatch;
  });

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card
            key={i}
            className="bg-white/10 backdrop-blur border-white/20 animate-pulse"
          >
            <CardContent className="p-4">
              <div className="w-full h-48 bg-gray-700 rounded-lg mb-4"></div>
              <div className="h-4 bg-gray-700 rounded mb-2"></div>
              <div className="h-3 bg-gray-700 rounded mb-4"></div>
              <div className="h-8 bg-gray-700 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (filteredUsers.length === 0) {
    return (
      <Card className="bg-white/10 backdrop-blur border-white/20">
        <CardContent className="p-8 text-center">
          <h3 className="text-white font-bold text-xl mb-2">
            {noDataMessage || "No users found"}
          </h3>
          <p className="text-gray-300">
            {searchName || searchCity || searchState
              ? "Try adjusting your search criteria."
              : "Check back later for updates."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {filteredUsers.map((user) => (
        <Card
          key={user.id}
          className="bg-white/10 backdrop-blur border-white/20 hover:bg-white/20 transition-all duration-300 group"
        >
          <CardContent className="p-4">
            <div className="relative mb-4">
              <img
                src={user.profile_photo || "/placeholder.svg"}
                alt={user.username}
                className="w-full h-48 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-2 right-2">
                <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full capitalize">
                  {user.user_type}
                </span>
              </div>
            </div>

            <h3 className="text-white font-bold text-lg mb-2 truncate">
              @{user.username}
            </h3>

            {user.city && user.state && (
              <div className="flex items-center text-gray-300 text-sm mb-4">
                <MapPin size={14} className="mr-1" />
                <span className="truncate">
                  {user.city}, {user.state}
                </span>
              </div>
            )}

            <Button
              onClick={() => onUserSelect(user)}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold"
            >
              {actionType === "tip" ? "💎 Tip Now" : "⭐ Rate Now"}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default UsersList;
