import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { usePageVideo } from "@/hooks/usePageVideo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Flag, User, Heart } from "lucide-react";
import HomeProfileButton from "@/components/HomeProfileButton";
import AuthGuard from "@/components/AuthGuard";
import JackpotDisplay from "@/components/JackpotDisplay";
import TipAmountSelector from "@/components/TipAmountSelector";
import PayPalTipButton from "@/components/PayPalTipButton";
import UserProfileCard from "@/components/UserProfileCard";
import UsersList from "@/components/UsersList";
import TipStatusChecker from "@/components/TipStatusChecker";
import BannerVideo from "@/components/BannerVideo";
import { supabase } from "@/lib/supabase";
import { normalizeRefParam } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type RateFilter = "all" | "rated" | "not-rated";

interface User {
  id: string;
  username: string;
  profile_photo: string;
  city: string;
  state: string;
  user_type: string;
}

const TipGirls: React.FC = () => {
  const navigate = useNavigate();
  const { videoUrl: tipVideoUrl } = usePageVideo("tip_win_page");
  const [searchParams] = useSearchParams();
  const tipUsername = searchParams.get("tip");
  const refUsername = normalizeRefParam(searchParams.get("ref"));
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
  const [rateFilter, setRateFilter] = useState<RateFilter>("all");

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
      console.log("Fetching user by username:", username);
      // Use public_user_profiles view to bypass RLS restrictions
      const { data, error } = await supabase
        .from("public_user_profiles")
        .select("id, username, profile_photo, city, state, user_type")
        .eq("username", username)
        .in("user_type", ["stripper", "exotic"])
        .maybeSingle();

      console.log("TipGirls query result - data:", data, "error:", error);
      
      if (error) {
        console.error("Error fetching user:", error);
        return;
      }
      if (data) {
        setSelectedUser({
          id: String(data.id),
          username: String(data.username),
          profile_photo: String(data.profile_photo || ""),
          city: String(data.city || ""),
          state: String(data.state || ""),
          user_type: String(data.user_type),
        });
      } else {
        console.log("No user found for username:", username);
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

  const handleTipSuccess = (transactionId?: string) => {
    console.log("Tip successful, transaction:", transactionId);
    // Reset and go back to directory after a delay
    setTimeout(() => {
      setSelectedUser(null);
      setTipAmount(0);
      setMessage("");
    }, 3000);
  };

  const handleTipError = (error: string) => {
    console.error("Tip error:", error);
  };

  // inside TipGirls.tsx
const renderRateFilterButton = (value: RateFilter, label: string) => {
  const isActive = rateFilter === value;
  return (
    <Button
      type="button"
      onClick={() => setRateFilter(value)}
      className={`rounded-full px-6 py-2 text-sm font-semibold transition-all duration-200 ${
        isActive
          ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg border-transparent"
          : "bg-white/10 text-gray-100 border border-white/20 hover:bg-white/20"
      }`}
    >
      {label}
    </Button>
  );
};

  if (selectedUser) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-16">
          <div className="container mx-auto px-4 max-w-4xl">
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

                {currentUser && (
                  <PayPalTipButton
                    tipAmount={tipAmount}
                    tippedUsername={selectedUser.username}
                    tipperUserId={currentUser.id}
                    tipperUsername={currentUser.username || currentUser.email || "anonymous"}
                    referrerUsername={refUsername || undefined}
                    tipMessage={message}
                    onSuccess={handleTipSuccess}
                    onError={handleTipError}
                    disabled={tipAmount < 5}
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
            <div className="mt-6">
              <JackpotDisplay />
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
        {tipVideoUrl && (
          <BannerVideo src={tipVideoUrl} />
        )}

        <div className="text-center py-6 px-4">
          <h1 className="text-4xl md:text-6xl font-bold text-yellow-400 mb-4">
            💎 Tip & Win 💎
          </h1>
          <p className="text-xl text-gray-300">
            Tip your favorite Dimes and enter the jackpot!
          </p>
        </div>

        <div className="max-w-7xl mx-auto p-4">
          <div className="flex justify-start mb-4">
            <HomeProfileButton />
          </div>
          <div className="mb-8">
            <JackpotDisplay />
            <div className="mt-4 text-center">
              <Button
                onClick={() => navigate("/jackpot")}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-semibold px-6 py-3 h-auto text-center"
              >
                Want to know more about the jackpot?<br />Click here
              </Button>
            </div>
          </div>

          <Card className="bg-white/10 backdrop-blur border-white/20 mb-6">
            <CardContent className="p-6">
              <div className="space-y-4 md:space-y-0 md:flex md:space-x-4">
                <div className="relative flex-1">
                  <User
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-600 z-10"
                    size={20}
                  />
                  <Input
                    type="text"
                    placeholder="Search by name..."
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    className="pl-10 bg-white/90 border-2 border-purple-400 text-gray-900 placeholder-gray-500 w-full focus:border-yellow-400"
                  />
                </div>
                <div className="relative flex-1">
                  <MapPin
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-600 z-10"
                    size={20}
                  />
                  <Input
                    type="text"
                    placeholder="Search by city..."
                    value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)}
                    className="pl-10 bg-white/90 border-2 border-purple-400 text-gray-900 placeholder-gray-500 w-full focus:border-yellow-400"
                  />
                </div>
                <div className="relative flex-1">
                  <Flag
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-600 z-10"
                    size={20}
                  />
                  <Input
                    type="text"
                    placeholder="Search by state..."
                    value={searchState}
                    onChange={(e) => setSearchState(e.target.value)}
                    className="pl-10 bg-white/90 border-2 border-purple-400 text-gray-900 placeholder-gray-500 w-full focus:border-yellow-400"
                  />
                </div>
              </div>

        
            </CardContent>
          </Card>

          {/* {currentUser && (
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
                          Start tipping your favorite Dimes to enter the
                          jackpot below!
                        </p>
                      </CardContent>
                    </Card>
                  );
                }
                return null;
              }}
            </TipStatusChecker>
          )} */}

          <UsersList
            searchName={searchName}
            searchCity={searchCity}
            searchState={searchState}
            rateFilter={rateFilter}
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