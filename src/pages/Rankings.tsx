import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { Trophy, Medal, Award, Star, MapPin, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

interface RatingWithUser {
  rating: number;
  users: {
    id: string;
    username: string;
    profile_photo: string | null;
    city: string | null;
    state: string | null;
    user_type: string;
  } | null;
}

const Rankings: React.FC = () => {
  const [rankings, setRankings] = useState<RankedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<
    "all" | "stripper" | "exotic"
  >("all");
  const navigate = useNavigate();

  useEffect(() => {
    fetchRankings();
  }, [selectedType]);

  const fetchRankings = async () => {
    try {
      setLoading(true);
      const currentYear = new Date().getFullYear();

      // Get all ratings for the current year
      const { data: ratingsData, error: ratingsError } = await supabase
        .from("ratings")
        .select("user_id, rating")
        .eq("year", currentYear);

      if (ratingsError) {
        console.error("Error fetching ratings:", ratingsError);
        return;
      }

      // Get all users who are strippers or exotics
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, username, profile_photo, city, state, user_type")
        .in("user_type", ["stripper", "exotic"]);

      if (usersError) {
        console.error("Error fetching users:", usersError);
        return;
      }

      if (ratingsData && usersData) {
        // Group ratings by user and calculate totals
        const userScores: { [userId: string]: RankedUser } = {};

        // Initialize user scores
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

        // Add up ratings for each user
        (ratingsData as RatingData[]).forEach((rating) => {
          if (userScores[rating.user_id]) {
            userScores[rating.user_id].total_score += rating.rating;
            userScores[rating.user_id].rating_count += 1;
          }
        });

        // Convert to array and filter out users with no ratings, then sort by total score
        let rankedUsers = Object.values(userScores)
          .filter((user) => user.rating_count > 0)
          .sort((a, b) => b.total_score - a.total_score);

        // Filter by selected type
        if (selectedType !== "all") {
          rankedUsers = rankedUsers.filter(
            (user) => user.user_type === selectedType
          );
        }

        // Assign ranks
        rankedUsers.forEach((user, index) => {
          user.rank = index + 1;
        });

        setRankings(rankedUsers);
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
        return <Trophy className="w-8 h-8 text-yellow-400" />;
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
        return "bg-gradient-to-r from-yellow-400 to-yellow-600";
      case 2:
        return "bg-gradient-to-r from-gray-300 to-gray-500";
      case 3:
        return "bg-gradient-to-r from-amber-500 to-amber-700";
      default:
        return "bg-gradient-to-r from-purple-500 to-pink-600";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading rankings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-yellow-400 mb-4">
            🏆 2025 RANKINGS 🏆
          </h1>
          <p className="text-gray-300 text-lg">
            Top performers ranked by total rating scores
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex justify-center gap-4 mb-8">
          <Button
            onClick={() => setSelectedType("all")}
            className={`px-6 py-3 font-semibold ${
              selectedType === "all"
                ? "bg-yellow-500 text-black hover:bg-yellow-600"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            All Performers
          </Button>
          <Button
            onClick={() => setSelectedType("stripper")}
            className={`px-6 py-3 font-semibold ${
              selectedType === "stripper"
                ? "bg-pink-500 text-white hover:bg-pink-600"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            Strippers
          </Button>
          <Button
            onClick={() => setSelectedType("exotic")}
            className={`px-6 py-3 font-semibold ${
              selectedType === "exotic"
                ? "bg-purple-500 text-white hover:bg-purple-600"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            Exotics
          </Button>
        </div>

        {/* Rankings List */}
        {rankings.length === 0 ? (
          <Card className="bg-white/10 backdrop-blur border-white/20 max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <h3 className="text-xl font-bold text-yellow-400 mb-4">
                No Rankings Yet
              </h3>
              <p className="text-gray-300 mb-4">
                No ratings have been submitted for 2025 yet.
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
          <div className="space-y-4">
            {rankings.map((user, index) => (
              <Card
                key={user.id}
                className={`
                  bg-white/10 backdrop-blur border-white/20 hover:bg-white/20 
                  transition-all duration-300 overflow-hidden
                  ${
                    user.rank <= 3
                      ? "border-2 border-yellow-400/50 shadow-lg"
                      : ""
                  }
                `}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-6">
                    {/* Rank */}
                    <div className="flex-shrink-0 text-center">
                      <div
                        className={`
                        w-16 h-16 rounded-full flex items-center justify-center
                        ${getRankColor(user.rank)}
                      `}
                      >
                        {getRankIcon(user.rank)}
                      </div>
                      <div className="mt-2 font-bold text-lg text-yellow-400">
                        #{user.rank}
                      </div>
                    </div>

                    {/* User Info */}
                    <div className="flex items-center gap-4 flex-1">
                      <img
                        src={user.profile_photo || "/placeholder.svg"}
                        alt={user.username}
                        className="w-20 h-20 rounded-full object-cover border-2 border-yellow-400"
                      />
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-yellow-400 mb-2">
                          @{user.username}
                        </h3>
                        <div className="flex items-center gap-4 text-gray-300 text-sm">
                          <div className="flex items-center gap-1">
                            <User size={14} />
                            <span className="capitalize">{user.user_type}</span>
                          </div>
                          {user.city && user.state && (
                            <div className="flex items-center gap-1">
                              <MapPin size={14} />
                              <span>
                                {user.city}, {user.state}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="text-right">
                      <div className="text-3xl font-bold text-yellow-400 mb-1">
                        {user.total_score.toLocaleString()}
                      </div>
                      <div className="text-gray-300 text-sm">Total Score</div>
                      <div className="text-gray-400 text-xs mt-1">
                        {user.rating_count} ratings
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Back to Rating Button */}
        <div className="text-center mt-12">
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
