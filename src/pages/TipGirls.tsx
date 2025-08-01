import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Flag, User, Heart } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import JackpotDisplay from "@/components/JackpotDisplay";
import PayPalTipButton from "@/components/PayPalTipButton";
import TipAmountSelector from "@/components/TipAmountSelector";
import UserProfileCard from "@/components/UserProfileCard";
import UsersList from "@/components/UsersList";
import TipStatusChecker from "@/components/TipStatusChecker";
import { supabase } from "@/lib/supabase";
import { getReferralUsername } from "@/lib/utils";

interface User {
  id: string;
  username: string;
  profile_photo: string;
  city: string;
  state: string;
  user_type: string;
}

const TipGirls: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tipUsername = searchParams.get("tip");
  const refUsername = getReferralUsername(searchParams) || "demo";
  const [searchName, setSearchName] = useState("");
  const [searchCity, setSearchCity] = useState("");
  const [searchState, setSearchState] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [message, setMessage] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email?: string;
    username?: string;
  } | null>(null);

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (tipUsername) {
      fetchUserByUsername(tipUsername);
    }
  }, [tipUsername]);

  const getCurrentUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: userData, error } = await supabase
          .from("users")
          .select("username")
          .eq("id", user.id)
          .single();

        if (!error && userData) {
          setCurrentUser({
            id: user.id,
            email: user.email,
            username: String(userData.username),
          });
        } else {
          setCurrentUser(user);
        }
      }
    } catch (error) {
      console.error("Error getting current user:", error);
    }
  };

  const fetchUserByUsername = async (username: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, username, profile_photo, city, state, user_type")
        .eq("username", username)
        .in("user_type", ["stripper", "exotic"])
        .single();

      if (error) throw error;
      if (data) {
        setSelectedUser({
          id: String(data.id),
          username: String(data.username),
          profile_photo: String(data.profile_photo || ""),
          city: String(data.city || ""),
          state: String(data.state || ""),
          user_type: String(data.user_type),
        });
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  const handleUserSelect = (user: User) => {
    const currentUserUsername = currentUser?.username || "guest";
    const url = `/tip/?tip=${user.username}&ref=${currentUserUsername}`;
    window.location.href = url;
  };

  // If showing specific user for tipping
  if (selectedUser) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            {/* Removed grid layout */}
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader className="text-center">
                <CardTitle className="text-white text-3xl mb-4">
                  <Heart className="w-8 h-8 inline-block mr-2 text-red-500" />
                  Tip @{selectedUser.username}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <UserProfileCard
                  username={selectedUser.username}
                  profileImage={selectedUser.profile_photo}
                  location={`${selectedUser.city}, ${selectedUser.state}`}
                />

                <TipAmountSelector
                  selectedAmount={tipAmount}
                  onAmountChange={setTipAmount}
                  customAmount={customAmount}
                  onCustomAmountChange={setCustomAmount}
                />

                <div>
                  <label className="block text-white mb-2">
                    Message (Optional)
                  </label>
                  <textarea
                    placeholder="Leave a nice message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 resize-none"
                    rows={3}
                    maxLength={200}
                  />
                </div>

                {tipAmount > 0 && (
                  <PayPalTipButton
                    tipAmount={tipAmount}
                    tippedUsername={selectedUser.username}
                    referrerUsername={refUsername}
                    tipperUsername="current_user"
                  />
                )}

                <Button
                  onClick={() => setSelectedUser(null)}
                  variant="outline"
                  className="w-full border-white/30 text-white hover:bg-white/20"
                >
                  Back to Directory
                </Button>
              </CardContent>
            </Card>
            {/* Moved JackpotDisplay below, full width */}
            <div className="mt-6">
              <JackpotDisplay />
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  // Directory view
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
        {/* Video Banner */}
        <div className="relative w-full h-64 md:h-80 lg:h-96 overflow-hidden">
          <video
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            poster="https://dimesonly.s3.us-east-2.amazonaws.com/HOUSING-ANGELS+(1).png"
          >
            <source
              src="https://dimesonlyworld.s3.us-east-2.amazonaws.com/HOME+PAGE+16-9+1080+final.mp4"
              type="video/mp4"
            />
          </video>
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold text-yellow-400 mb-4">
                💎 Tip & Win 💎
              </h1>
              <p className="text-xl text-gray-300">
                Support your favorite dancers and enter the jackpot!
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-4">
          {/* Removed grid layout */}
          {/* Jackpot Results Section */}
          <div className="mb-8">
            <JackpotDisplay />
          </div>

          {/* Search Section */}
          <Card className="bg-white/10 backdrop-blur border-white/20 mb-6">
            <CardContent className="p-6">
              <div className="space-y-4 md:space-y-0 md:flex md:space-x-4">
                <div className="relative flex-1">
                  <User
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                  <Input
                    type="text"
                    placeholder="Search by name..."
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    className="pl-10 bg-white/20 border-white/30 text-white placeholder-gray-300 w-full"
                  />
                </div>
                <div className="relative flex-1">
                  <MapPin
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                  <Input
                    type="text"
                    placeholder="Search by city..."
                    value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)}
                    className="pl-10 bg-white/20 border-white/30 text-white placeholder-gray-300 w-full"
                  />
                </div>
                <div className="relative flex-1">
                  <Flag
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                  <Input
                    type="text"
                    placeholder="Search by state..."
                    value={searchState}
                    onChange={(e) => setSearchState(e.target.value)}
                    className="pl-10 bg-white/20 border-white/30 text-white placeholder-gray-300 w-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Message */}
          {currentUser && (
            <TipStatusChecker userId={currentUser.id}>
              {(hasTips, hasBeenTipped) => {
                if (!hasTips && !hasBeenTipped) {
                  return (
                    <Card className="bg-yellow-900/20 border-yellow-500 mb-6">
                      <CardContent className="p-4 text-center">
                        <h3 className="text-yellow-400 font-bold text-lg mb-2">
                          NO TIPS YET MADE IN 2025. BE THE 1ST!
                        </h3>
                        <p className="text-yellow-300 text-sm">
                          Start tipping your favorite dancers to enter the
                          jackpot!
                        </p>
                      </CardContent>
                    </Card>
                  );
                }
                return null;
              }}
            </TipStatusChecker>
          )}

          {/* Users List */}
          <UsersList
            searchName={searchName}
            searchCity={searchCity}
            searchState={searchState}
            onUserSelect={handleUserSelect}
            actionType="tip"
            noDataMessage="NO TIPS YET IN 2025. BE THE 1ST!"
            orderBy="created_at"
            orderDirection="desc"
          />
        </div>
      </div>
    </AuthGuard>
  );
};

export default TipGirls;
