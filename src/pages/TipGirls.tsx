import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { usePageVideo } from "@/hooks/usePageVideo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Flag, User, Heart, Trophy, Ticket, Sparkles, ArrowLeft } from "lucide-react";
import HomeProfileButton from "@/components/HomeProfileButton";
import AuthGuard from "@/components/AuthGuard";
import JackpotDisplay from "@/components/JackpotDisplay";
import TipAmountSelector from "@/components/TipAmountSelector";
import PayPalTipButton from "@/components/PayPalTipButton";
import UserProfileCard from "@/components/UserProfileCard";
import UsersList from "@/components/UsersList";
import TipLeaderboard from "@/components/TipLeaderboard";
import BannerVideo from "@/components/BannerVideo";
import { supabase } from "@/lib/supabase";
import { normalizeRefParam } from "@/lib/utils";

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
  const [rateFilter] = useState<RateFilter>("all");

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
      // Use public_user_profiles view to bypass RLS restrictions
      const { data, error } = await supabase
        .from("public_user_profiles")
        .select("id, username, profile_photo, city, state, user_type")
        .eq("username", username)
        .in("user_type", ["stripper", "exotic"])
        .maybeSingle();

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
    setTimeout(() => {
      setSelectedUser(null);
      setTipAmount(0);
      setMessage("");
    }, 3000);
  };

  const handleTipError = (error: string) => {
    console.error("Tip error:", error);
  };

  if (selectedUser) {
    const location = [selectedUser.city, selectedUser.state].filter(Boolean).join(", ");

    return (
      <AuthGuard>
        <div className="min-h-screen bg-[#070409] py-10 text-white">
          <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(233,22,209,0.16),transparent_55%),radial-gradient(circle_at_80%_100%,rgba(250,204,21,0.08),transparent_55%)]" />

          <div className="relative mx-auto max-w-6xl px-4">
            <Button
              onClick={() => setSelectedUser(null)}
              variant="outline"
              className="mb-6 border-white/15 bg-transparent text-slate-200 hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Directory
            </Button>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
              {/* Recipient panel */}
              <aside className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0B0611] via-[#170A22] to-[#0B0611] shadow-[0_24px_70px_-40px_rgba(233,22,209,0.9)]">
                <div className="relative aspect-[4/5] overflow-hidden bg-slate-900">
                  <img
                    src={selectedUser.profile_photo || defaultAvatar.url}
                    alt={`${selectedUser.username} profile photo`}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = defaultAvatar.url;
                    }}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0B0611] via-[#0B0611]/30 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#E916D1]/40 bg-black/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#F5A3EA] backdrop-blur">
                      <Heart className="h-3 w-3 text-[#FF5FD1]" />
                      Tipping
                    </span>
                    <h1 className="mt-3 truncate text-3xl font-black text-white">
                      @{selectedUser.username}
                    </h1>
                    {location && (
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-300">
                        <MapPin className="h-3.5 w-3.5 text-[#FF5FD1]" />
                        {location}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3 p-5 text-sm text-slate-300">
                  <div className="flex items-start gap-2.5">
                    <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-yellow-300" />
                    <p>Every $1 tipped earns you 1 entry into the weekly jackpot drawing.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-[#FF5FD1]" />
                    <p>Your tips count toward her yearly Top 3 standing and your Top Tipper race.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <p>Payments are processed securely through PayPal.</p>
                  </div>
                </div>
              </aside>

              {/* Tip form */}
              <section className="rounded-3xl border border-white/10 bg-[#100A17] p-6 md:p-8">
                <div className="border-b border-white/10 pb-5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#F5A3EA]">
                    Tip Now
                  </span>
                  <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-white md:text-3xl">
                    Send Your{" "}
                    <span className="bg-gradient-to-r from-[#E916D1] via-[#FF5FD1] to-yellow-300 bg-clip-text text-transparent">
                      Tip
                    </span>
                  </h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Pick an amount, add a message, and complete your tip in seconds.
                  </p>
                </div>

                <div className="mt-6 space-y-6">
                  <TipAmountSelector
                    selectedAmount={tipAmount}
                    onAmountChange={setTipAmount}
                    customAmount={customAmount}
                    onCustomAmountChange={setCustomAmount}
                  />

                  <div className="rounded-2xl border border-white/10 bg-[#0B0611]/80 p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-200">
                        Add a Message
                      </label>
                      <span className="text-[10px] uppercase tracking-wider text-slate-500">
                        {message.length}/200
                      </span>
                    </div>
                    <textarea
                      placeholder="Say something nice..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full resize-none rounded-xl border border-white/15 bg-slate-900/60 p-3 text-white placeholder:text-slate-500 focus:border-[#E916D1] focus:outline-none"
                      rows={3}
                      maxLength={200}
                    />
                  </div>

                  {currentUser ? (
                    <div className="space-y-3">
                      {tipAmount < 5 && (
                        <p className="text-center text-xs uppercase tracking-wider text-slate-400">
                          Select at least $5 to continue
                        </p>
                      )}
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
                    </div>
                  ) : (
                    <p className="text-center text-sm text-slate-400">
                      Sign in to send a tip.
                    </p>
                  )}
                </div>
              </section>
            </div>

            <div className="mt-8">
              <JackpotDisplay />
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#070409] text-white">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(233,22,209,0.16),transparent_55%),radial-gradient(circle_at_80%_100%,rgba(250,204,21,0.08),transparent_55%)]" />

        {tipVideoUrl && <BannerVideo src={tipVideoUrl} />}

        <div className="relative mx-auto max-w-7xl space-y-8 px-4 py-8">
          <div className="flex justify-start">
            <HomeProfileButton />
          </div>

          {/* Hero */}
          <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0B0611] via-[#170A22] to-[#0B0611] px-6 py-12 md:px-12 md:py-16">
            <div className="pointer-events-none absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[#E916D1]/20 blur-3xl" />

            <div className="relative text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#E916D1]/40 bg-[#E916D1]/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#F5A3EA] backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                Weekly Jackpot Entry
              </span>

              <h1 className="mt-6 text-5xl font-black uppercase leading-[0.95] tracking-tight text-white md:text-7xl">
                Tip{" "}
                <span className="bg-gradient-to-r from-[#E916D1] via-[#FF5FD1] to-yellow-300 bg-clip-text text-transparent">
                  &amp; Win
                </span>
              </h1>
              <div className="mx-auto mt-4 h-[3px] w-28 rounded-full bg-gradient-to-r from-transparent via-[#E916D1] to-transparent" />

              <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-slate-300 md:text-base">
                Support your favorite Dimes and earn entries into the weekly jackpot drawing.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-[11px] uppercase tracking-widest text-slate-300">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  <Ticket className="h-3.5 w-3.5 text-[#FF5FD1]" />
                  Every tip earns entries
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  <Trophy className="h-3.5 w-3.5 text-yellow-300" />
                  Drawings every Saturday
                </span>
              </div>
            </div>
          </section>

          {/* Yearly top 3 highest tipped */}
          <TipLeaderboard />

          {/* Jackpot */}
          <div>
            <JackpotDisplay />
            <div className="mt-4 text-center">
              <Button
                onClick={() => navigate("/jackpot")}
                className="h-auto bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-3 text-center font-semibold text-black hover:from-yellow-600 hover:to-orange-600"
              >
                Want to know more about the jackpot?
                <br />
                Click here
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
              <Search className="h-3.5 w-3.5 text-[#E916D1]" />
              Find a Dime to tip
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search by name..."
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="h-11 border-white/15 bg-slate-900/60 pl-10 text-white placeholder:text-slate-400 focus-visible:ring-[#E916D1]"
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search by city..."
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                  className="h-11 border-white/15 bg-slate-900/60 pl-10 text-white placeholder:text-slate-400 focus-visible:ring-[#E916D1]"
                />
              </div>
              <div className="relative">
                <Flag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search by state..."
                  value={searchState}
                  onChange={(e) => setSearchState(e.target.value)}
                  className="h-11 border-white/15 bg-slate-900/60 pl-10 text-white placeholder:text-slate-400 focus-visible:ring-[#E916D1]"
                />
              </div>
            </div>
          </div>

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
