import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Gift, Users, Ticket, ArrowLeft, DollarSign, ChevronDown, ChevronUp } from "lucide-react";
import JackpotDisplay from "@/components/JackpotDisplay";
import JackpotWinnersBanner from "@/components/JackpotWinnersBanner";
import JackpotBreakdown from "@/components/JackpotBreakdown";
import { supabase } from "@/lib/supabase";

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "Date unavailable";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
};

const Jackpot: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<{ id: string; username?: string } | null>(null);
  const [ticketCount, setTicketCount] = useState<number>(0);
  const [showTicketDetails, setShowTicketDetails] = useState<boolean>(false);
  const [ticketCodes, setTicketCodes] = useState<{ code: string; created_at: string | null }[]>([]);
  const [visibleTicketCount, setVisibleTicketCount] = useState<number>(30);
  const [loadingTickets, setLoadingTickets] = useState<boolean>(false);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchUserTickets();
    }
  }, [currentUser]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from("users")
          .select("username")
          .eq("id", user.id)
          .single();

        setCurrentUser({
          id: user.id,
          username: userData?.username || undefined,
        });
      }
    } catch (error) {
      console.error("Error checking user:", error);
    }
  };

  const fetchUserTickets = async () => {
    if (!currentUser) return;

    try {
      const { data: pool } = await supabase
        .from("jackpot_pools")
        .select("id")
        .eq("status", "open")
        .single();

      if (pool) {
        const { count } = await supabase
          .from("jackpot_tickets")
          .select("*", { count: "exact", head: true })
          .eq("user_id", currentUser.id)
          .eq("pool_id", pool.id);

        setTicketCount(count || 0);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
    }
  };

  const fetchTicketCodes = async () => {
    if (!currentUser) return;
    setLoadingTickets(true);

    try {
      const { data: pool } = await supabase
        .from("jackpot_pools")
        .select("id")
        .eq("status", "open")
        .single();

      if (pool) {
        const { data: tickets, error } = await supabase
          .from("jackpot_tickets")
          .select("code, created_at")
          .eq("user_id", currentUser.id)
          .eq("pool_id", pool.id)
          .order("created_at", { ascending: false });

        if (!error && tickets) {
          setTicketCodes(tickets);
        }
      }
    } catch (error) {
      console.error("Error fetching ticket codes:", error);
    } finally {
      setLoadingTickets(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header */}
      <div className="bg-black/50 py-4 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold text-yellow-400 flex items-center gap-2">
            <Trophy className="w-8 h-8" />
            JACKPOT
          </h1>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-8">
        {/* Current Jackpot Display */}
        <div className="text-center">
          <JackpotDisplay />
        </div>

        {/* User's Tickets (if logged in) */}
        {currentUser && (
          <Card className="bg-white/10 backdrop-blur border-yellow-500/30">
            <CardHeader>
              <CardTitle className="text-yellow-400 flex items-center gap-2">
                <Ticket className="w-6 h-6" />
                Your Tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-4xl font-bold text-white mb-2">{ticketCount}</p>
                <p className="text-gray-300">
                  {ticketCount === 1 ? "ticket" : "tickets"} in current pool
                </p>
                <Button
                  onClick={() => {
                    if (!showTicketDetails && ticketCodes.length === 0) {
                      fetchTicketCodes();
                    }
                    setShowTicketDetails(!showTicketDetails);
                  }}
                  className="mt-4 bg-yellow-500 hover:bg-yellow-600 text-black"
                  disabled={loadingTickets}
                >
                  {loadingTickets ? (
                    <AngelLoader variant="inline" />
                  ) : showTicketDetails ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-2" />
                      Hide Ticket Details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-2" />
                      View My Ticket Details
                    </>
                  )}
                </Button>
              </div>

              {/* Ticket Codes Display */}
              {showTicketDetails && (
                <div className="mt-6 border-t border-white/20 pt-6">
                  <h3 className="text-lg font-semibold text-yellow-400 mb-4 flex items-center gap-2">
                    <Ticket className="w-5 h-5" />
                    Your Ticket Codes (This Week)
                  </h3>
                  {ticketCodes.length > 0 ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {ticketCodes.slice(0, visibleTicketCount).map((ticket, idx) => (
                          <div
                            key={idx}
                            className="rounded-md border border-white/20 bg-white/10 p-3 text-center"
                          >
                            <Badge
                              variant="secondary"
                              className="text-sm mb-2 bg-yellow-500 text-black font-mono"
                            >
                              {ticket.code}
                            </Badge>
                            <div className="text-xs text-gray-300">
                              {formatDate(ticket.created_at)}
                            </div>
                          </div>
                        ))}
                      </div>
                      {ticketCodes.length > visibleTicketCount && (
                        <div className="text-center mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setVisibleTicketCount((prev) => prev + 30)}
                            className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20"
                          >
                            Show more ({ticketCodes.length - visibleTicketCount} remaining)
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-400 text-center">
                      No tickets yet. Tip to earn your first ticket!
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* How It Works Section */}
        <Card className="bg-white/10 backdrop-blur border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Gift className="w-6 h-6 text-purple-400" />
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-lg p-4 text-center">
                <DollarSign className="w-10 h-10 mx-auto text-green-400 mb-2" />
                <h3 className="font-semibold text-lg mb-1">1. Tip a Dime</h3>
                <p className="text-gray-300 text-sm">
                  Every tip you make generates jackpot tickets for you and others in the chain.
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-4 text-center">
                <Ticket className="w-10 h-10 mx-auto text-yellow-400 mb-2" />
                <h3 className="font-semibold text-lg mb-1">2. Get Tickets</h3>
                <p className="text-gray-300 text-sm">
                  Each tip creates 6 identical tickets distributed to: tipper, performer, and referrers.
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-4 text-center">
                <Trophy className="w-10 h-10 mx-auto text-orange-400 mb-2" />
                <h3 className="font-semibold text-lg mb-1">3. Win Big</h3>
                <p className="text-gray-300 text-sm">
                  Weekly drawings every Saturday at 11:59 PM PST. 6 winners share the pot!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prize Distribution */}
        <Card className="bg-white/10 backdrop-blur border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-400" />
              Prize Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-yellow-900/40 to-yellow-700/20 rounded-lg p-4 border border-yellow-500/30">
                <h3 className="text-yellow-400 font-bold text-lg mb-2">🥇 1st Place (Grand Prize)</h3>
                <p className="text-gray-300">
                  The tipper and the dime who was tipped share ~25% of the jackpot each.
                </p>
              </div>
              <div className="bg-gradient-to-r from-gray-600/40 to-gray-500/20 rounded-lg p-4 border border-gray-400/30">
                <h3 className="text-gray-300 font-bold text-lg mb-2">🥈 2nd Place</h3>
                <p className="text-gray-400">
                  Referrers of the performer and tipper receive smaller percentages.
                </p>
              </div>
              <div className="bg-gradient-to-r from-orange-900/40 to-orange-700/20 rounded-lg p-4 border border-orange-500/30">
                <h3 className="text-orange-400 font-bold text-lg mb-2">🥉 3rd Place</h3>
                <p className="text-gray-300">
                  Additional referrer levels share remaining prize amounts.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Breakdown */}
        <JackpotBreakdown />

        {/* Latest Winners */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            Latest Winners
          </h2>
          <JackpotWinnersBanner />
        </div>

        {/* Call to Action */}
        <Card className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 backdrop-blur border-purple-500/30">
          <CardContent className="py-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">
              Ready to Win?
            </h2>
            <p className="text-gray-300 mb-6">
              Start tipping your favorite Dimes to enter the jackpot!
            </p>
            <Button
              onClick={() => navigate("/tip-girls")}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold px-8 py-4 text-lg"
            >
              Start Tipping Now
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Jackpot;
