import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, User, MapPin, Flag, Trophy, Crown, X } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import UsersList from "@/components/UsersList";
import RatingStatusChecker from "@/components/RatingStatusChecker";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface User {
  id: string;
  username: string;
  profile_photo: string;
  city: string;
  state: string;
  user_type: string;
}

interface RankedUser {
  id: string;
  username: string;
  profile_photo: string;
  city: string;
  state: string;
  user_type: string;
  total_score: number;
  rank: number;
}

const RateGirls: React.FC = () => {
  const [searchParams] = useSearchParams();
  const rateUsername = searchParams.get("rate");
  const refUsername = searchParams.get("ref") || "";
  const [searchName, setSearchName] = useState("");
  const [searchCity, setSearchCity] = useState("");
  const [searchState, setSearchState] = useState("");
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email?: string;
  } | null>(null);
  const [topRanked, setTopRanked] = useState<RankedUser[]>([]);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    username: string;
  } | null>(null);

  useEffect(() => {
    getCurrentUser();
    fetchTopRanked();
  }, []);

  const getCurrentUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);
    } catch (error) {
      console.error("Error getting current user:", error);
    }
  };

  const fetchTopRanked = async () => {
    try {
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
        usersData.forEach(
          (user: {
            id: unknown;
            username: unknown;
            profile_photo: unknown;
            city: unknown;
            state: unknown;
            user_type: unknown;
          }) => {
            userScores[String(user.id)] = {
              id: String(user.id),
              username: String(user.username),
              profile_photo: String(user.profile_photo || ""),
              city: String(user.city || ""),
              state: String(user.state || ""),
              user_type: String(user.user_type),
              total_score: 0,
              rank: 0,
            };
          }
        );

        // Add up ratings for each user
        ratingsData.forEach((rating: { user_id: unknown; rating: unknown }) => {
          if (userScores[String(rating.user_id)]) {
            userScores[String(rating.user_id)].total_score += Number(
              rating.rating
            );
          }
        });

        // Convert to array and filter out users with no ratings, then sort by total score
        const rankedUsers = Object.values(userScores)
          .filter((user) => user.total_score > 0)
          .sort((a, b) => b.total_score - a.total_score);

        // Assign ranks and take top 20
        rankedUsers.forEach((user, index) => {
          user.rank = index + 1;
        });

        setTopRanked(rankedUsers.slice(0, 20));
      }
    } catch (error) {
      console.error("Error fetching top ranked:", error);
    }
  };

  const handleUserSelect = (user: User) => {
    // Trim the username to remove any spaces
    const trimmedUsername = user.username.trim();
    const url = `/rate/?rate=${trimmedUsername}${
      refUsername ? `&ref=${refUsername}` : ""
    }`;
    window.location.href = url;
  };

  const handleImageClick = (
    imageUrl: string,
    username: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation(); // Prevent card click from firing
    setSelectedImage({ url: imageUrl, username });
    setShowImageModal(true);
  };

  const clearFilters = () => {
    setSearchName("");
    setSearchCity("");
    setSearchState("");
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
        {/* Video Banner */}
        <div className="relative w-full bg-black">
          <div className="relative w-full h-0" style={{ paddingBottom: '56.25%' }}>
            <video
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              poster="https://dimesonly.s3.us-east-2.amazonaws.com/HOUSING-ANGELS+(1).png"
            >
              <source
                //src="https://dimesonlyworld.s3.us-east-2.amazonaws.com/HOME+PAGE+16-9+1080+final.mp4"
                type="video/mp4"
              />
            </video>
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl md:text-6xl font-bold text-yellow-400 mb-4">
                  ⭐ Rate 100 Ladies' Profiles ⭐
                </h1>
                <p className="text-xl text-gray-300">
                  Search by name, city, or state to find a specific lady you want
                  to rate!
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-4">
          {/* Top 20 Ranked Section */}
          {topRanked.length > 0 && (
            <div className="mb-12">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-yellow-400 mb-2 flex items-center justify-center gap-2">
                  <Crown className="w-8 h-8" />
                  Top 20 Ranked Ladies
                  <Crown className="w-8 h-8" />
                </h2>
                <p className="text-gray-300">
                  Leading performers in the 2025 rankings
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mb-8">
                {topRanked.map((user) => (
                  <Card
                    key={user.id}
                    className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 backdrop-blur border-yellow-500/50 hover:border-yellow-400 transition-all duration-300 group cursor-pointer overflow-hidden"
                    onClick={() => handleUserSelect(user)}
                  >
                    <CardContent className="p-3 sm:p-4">
                      <div className="relative mb-3 sm:mb-4">
                        <img
                          src={user.profile_photo || "/placeholder.svg"}
                          alt={user.username}
                          className="w-full h-32 sm:h-40 md:h-48 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                          onClick={(e) =>
                            handleImageClick(
                              user.profile_photo || "/placeholder.svg",
                              user.username,
                              e
                            )
                          }
                        />
                        <div className="absolute top-2 left-2">
                          <div className="bg-yellow-500 text-black text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1">
                            <Trophy className="w-3 h-3" />#{user.rank}
                          </div>
                        </div>
                        <div className="absolute top-2 right-2">
                          <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full capitalize">
                            {user.user_type}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-violet-600 font-bold text-sm sm:text-base md:text-lg truncate">
                          @{user.username}
                        </h3>

                        {user.city && user.state && (
                          <div className="flex items-center text-gray-900 text-xs sm:text-sm">
                            <MapPin size={12} className="mr-1 flex-shrink-0" />
                            <span className="truncate">
                              {user.city}, {user.state}
                            </span>
                          </div>
                        )}

                        <div className="text-center pt-2 border-t border-white/10">
                          <div className="text-violet-600 font-bold text-sm sm:text-base md:text-lg">
                            {user.total_score.toLocaleString()}
                          </div>
                          <div className="text-gray-900 text-xs">
                            Total Score
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
              <span className="text-red-500">RATE GIRLS PAGE</span>
              <br />
              How it works:
            </h2>

            <p className="text-white text-lg leading-relaxed max-w-4xl mx-auto">
              Begin by rating the ladies. For every 100 new females who join,
              you will receive a text notification to rate the next group of 100
              images during your available time. The top-rated females will be
              featured at the top of each subsequent group of 100.
            </p>
          </div>

          {/* Search Section */}
          <div className="max-w-6xl mx-auto mb-8">
            <div className="bg-white/10 backdrop-blur rounded-2xl p-8 shadow-lg border border-white/20">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="relative group">
                  <label className="block text-sm font-semibold text-white mb-2 items-center gap-2">
                    <User size={16} className="text-blue-400" />
                    Search by Name
                  </label>
                  <div className="relative">
                    <Search
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                      size={20}
                    />
                    <Input
                      type="text"
                      placeholder="e.g., Miami, Sky, Mercedes..."
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white/20 border-2 border-white/30 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-white placeholder-gray-300"
                    />
                  </div>
                </div>

                <div className="relative group">
                  <label className="block text-sm font-semibold text-white mb-2 items-center gap-2">
                    <MapPin size={16} className="text-green-400" />
                    Search by City
                  </label>
                  <div className="relative">
                    <Search
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                      size={20}
                    />
                    <Input
                      type="text"
                      placeholder="e.g., Phoenix, Las Vegas, Dallas..."
                      value={searchCity}
                      onChange={(e) => setSearchCity(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white/20 border-2 border-white/30 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 text-white placeholder-gray-300"
                    />
                  </div>
                </div>

                <div className="relative group">
                  <label className="block text-sm font-semibold text-white mb-2 items-center gap-2">
                    <Flag size={16} className="text-purple-400" />
                    Search by State
                  </label>
                  <div className="relative">
                    <Search
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                      size={20}
                    />
                    <Input
                      type="text"
                      placeholder="e.g., AZ, CA, TX, NV..."
                      value={searchState}
                      onChange={(e) => setSearchState(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white/20 border-2 border-white/30 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 text-white placeholder-gray-300"
                    />
                  </div>
                </div>
              </div>

              {(searchName || searchCity || searchState) && (
                <div className="mt-6 text-center">
                  <Button
                    onClick={clearFilters}
                    variant="outline"
                    className="inline-flex items-center gap-2 px-6 py-3 border-white/30 text-white hover:bg-white/20"
                  >
                    <Search size={16} />
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Status Message */}
          {currentUser && (
            <RatingStatusChecker userId={currentUser.id}>
              {(hasRatings, hasBeenRated) => {
                if (!hasRatings && !hasBeenRated) {
                  return (
                    <Card className="bg-red-900/20 border-red-500 mb-6 max-w-4xl mx-auto">
                      <CardContent className="p-4 text-center">
                        <h3 className="text-red-400 font-bold text-lg mb-2">
                          NO RATES YET MADE IN 2025. BE THE 1ST!
                        </h3>
                        <p className="text-red-300 text-sm">
                          See who will be at the Pay Per View semi final for a
                          spot on Housing Angels, a reality show coming on
                          Tronix Network
                        </p>
                      </CardContent>
                    </Card>
                  );
                }
                return null;
              }}
            </RatingStatusChecker>
          )}

          {/* Users List */}
          <UsersList
            searchName={searchName}
            searchCity={searchCity}
            searchState={searchState}
            onUserSelect={handleUserSelect}
            actionType="rate"
            noDataMessage="NO RATES YET IN 2025. BE THE 1ST!"
            orderBy="created_at"
            orderDirection="desc"
            onImageClick={handleImageClick}
          />
        </div>
      </div>

      {/* Image Modal */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="bg-gray-800 border-yellow-500 max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-yellow-400 flex items-center gap-2">
              Photo - @{selectedImage?.username}
            </DialogTitle>
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </DialogHeader>
          <div className="flex items-center justify-center max-h-[70vh]">
            {selectedImage && (
              <img
                src={selectedImage.url}
                alt={`${selectedImage.username} photo`}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AuthGuard>
  );
};

export default RateGirls;
