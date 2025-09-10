import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Trophy,
  Ticket,
  Archive,
  Calendar,
  Crown,
  ExternalLink,
  User,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/types";

type JackpotWinner = Tables<"jackpot_winners">;

interface UserJackpotTabProps {
  userData: Tables<"users">;
}

const UserJackpotTab: React.FC<UserJackpotTabProps> = ({ userData }) => {
  const [currentTickets, setCurrentTickets] = useState(0);
  const [archivedTickets, setArchivedTickets] = useState<
    Array<{ date: string; tickets: number }>
  >([]);
  const [winners, setWinners] = useState<JackpotWinner[]>([]);
  const [ticketNumbers, setTicketNumbers] = useState<string[]>([]);
  const [currentJackpot, setCurrentJackpot] = useState(0);
  const [showArchive, setShowArchive] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (userData?.id) {
      fetchJackpotData();
      fetchWinners();
      fetchArchivedTickets();
      fetchUserTickets();
    }
  }, [userData?.id]);

  const fetchJackpotData = async () => {
    try {
      const { data: jackpotData } = await supabase
        .from("jackpot")
        .select("amount")
        .single();

      if (jackpotData?.amount) {
        setCurrentTickets(Number(jackpotData.amount) || 0);
      }

      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const { data: tipsData } = await supabase
        .from("tips")
        .select("tip_amount")
        .eq("user_id", userData.id)
        .gte("created_at", weekStart.toISOString());

      if (tipsData) {
        const tickets = tipsData.reduce(
          (total, tip) => total + Math.floor(Number(tip.tip_amount) || 0),
          0
        );
        setCurrentTickets(tickets);
      }
    } catch (error) {
      console.error("Error fetching jackpot data:", error);
    }
  };

  const fetchWinners = async () => {
    try {
      const { data: winnersData } = await supabase
        .from("jackpot_winners")
        .select("*")
        .order("draw_date", { ascending: false })
        .limit(10);

      if (winnersData) {
        setWinners(winnersData as JackpotWinner[]);
      }
    } catch (error) {
      console.error("Error fetching winners:", error);
    }
  };

  const fetchArchivedTickets = async () => {
    try {
      const { data: ticketsData } = await supabase
        .from("jackpot_tickets")
        .select("draw_date, tickets_count")
        .eq("user_id", userData.id)
        .order("draw_date", { ascending: false });

      if (ticketsData) {
        const formatted = ticketsData.map((ticket) => ({
          date: String(ticket.draw_date),
          tickets: Number(ticket.tickets_count) || 0,
        }));
        setArchivedTickets(formatted);
      }
    } catch (error) {
      console.error("Error fetching archived tickets:", error);
    }
  };

  const fetchUserTickets = async () => {
    try {
      const { data: ticketsData, error } = await supabase
        .from("tickets")
        .select("ticket_number")
        .eq("user_Id", userData.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (ticketsData) {
        const numbers = ticketsData
          .map((t) => t.ticket_number)
          .filter((n): n is string => Boolean(n));
        setTicketNumbers(numbers);
        setCurrentTickets(numbers.length);
      }
    } catch (error) {
      console.error("Error fetching user ticket numbers:", error);
    }
  };

  const safeToFixed = (
    value: number | string | null | undefined,
    decimals: number = 2
  ) => {
    const num = Number(value) || 0;
    return num.toFixed(decimals);
  };

  return (
    <div className="space-y-6">
      {/* Profile Stats Detail */}
      <Card className="shadow-lg border-0">
        <CardContent className="p-6">
          <h4 className="text-gray-900 font-semibold mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            Profile Stats Detail
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">
                {userData.user_type?.charAt(0).toUpperCase() +
                  (userData.user_type?.slice(1) || "")}
              </div>
              <div className="text-sm text-gray-600">User Type</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">
                {userData.gender?.charAt(0).toUpperCase() +
                  (userData.gender?.slice(1) || "N/A")}
              </div>
              <div className="text-sm text-gray-600">Gender</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">
                {userData.lottery_tickets || 0}
              </div>
              <div className="text-sm text-gray-600">Lottery Tickets</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {userData.is_ranked && userData.rank_number
                  ? `#${userData.rank_number}`
                  : "Unranked"}
              </div>
              <div className="text-sm text-gray-600">Rank</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jackpot Display */}
      <Card className="bg-gradient-to-r from-red-500 via-red-600 to-red-700 text-white">
        <CardContent className="p-8 text-center">
          <div className="mb-4">
            <Crown className="w-16 h-16 mx-auto mb-4 text-red-200" />
            <h2 className="text-4xl font-bold mb-2">JACKPOT</h2>
            <div className="text-6xl font-bold mb-2">
              ${currentJackpot.toLocaleString()}
            </div>
            <p className="text-xl text-red-100">Current Jackpot Amount</p>
          </div>

          <div className="bg-white/20 rounded-lg p-4 mb-4">
            <p className="text-lg mb-2">When POT Gets to $1,000</p>
            <p className="text-xl font-bold">Countdown begins!</p>
            <p className="text-sm mt-2">
              ${(1000 - currentJackpot).toLocaleString()} to go • max jackpot
              $1,973,400 a week
            </p>
          </div>

          <div className="space-y-2 text-left bg-white/10 rounded-lg p-4">
            <p className="flex items-center gap-2">
              <span>💎</span> Every tip = lottery tickets
            </p>
            <p className="flex items-center gap-2">
              <span>🎯</span> Weekly drawings until winner
            </p>
            <div className="mt-4 flex flex-col items-center space-y-2">
             <video 
  src="https://dimesonlyworld.s3.us-east-2.amazonaws.com/Tip+and+Win+(1).mp4" 
  alt="Tip & Win" 
  className="w-64 h-64 md:w-80 md:h-80 object-cover rounded-lg shadow-lg border-4 border-yellow-400 hover:border-yellow-300 transition-colors" 
autoplay="true" 
  loop="true" 
  muted="true"
  playsinline
>
</video>
              <p className="text-sm text-center max-w-md">
                View winners and live drawings on YouTube Live{" "}
                <a
                  href="https://www.youtube.com/@DimesOnlyWorld"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 underline hover:text-red-200"
                >
                  Click Here to Subscribe <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Tickets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="w-5 h-5" />
            Your Current Tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-6">
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {currentTickets}
            </div>
            <p className="text-gray-600 mb-4">Tickets for upcoming drawing</p>
            <Badge variant="outline" className="text-sm">
              1 tip = 1 ticket (rounded down)
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Ticket Numbers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="w-5 h-5" />
            Your Ticket Numbers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ticketNumbers.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {ticketNumbers.map((num, idx) => (
                <Badge key={idx} variant="secondary" className="justify-center">
                  {num}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500">
              <Ticket className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No tickets yet. Tip to earn your first ticket!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Archive Toggle */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={() => setShowArchive(!showArchive)}
          className="flex items-center gap-2"
        >
          <Archive className="w-4 h-4" />
          {showArchive ? "Hide" : "View"} Ticket Archive
        </Button>
      </div>

      {/* Archived Tickets */}
      {showArchive && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="w-5 h-5" />
              Ticket Archive
            </CardTitle>
          </CardHeader>
          <CardContent>
            {archivedTickets.length > 0 ? (
              <div className="space-y-3">
                {archivedTickets.map((entry, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">{entry.date}</span>
                    </div>
                    <Badge variant="secondary">{entry.tickets} tickets</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Ticket className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Get your first ticket today by tipping a dime now.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Winners */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Recent Winners
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {winners.length > 0 ? (
              winners.map((winner) => (
                <div
                  key={winner.id}
                  className="flex items-center gap-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={winner.profile_photo || undefined} />
                    <AvatarFallback>
                      {winner.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">
                      {winner.username}
                    </div>
                    <div className="text-sm text-gray-600">
                      Won on {new Date(winner.draw_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      ${winner.amount_won.toLocaleString()}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {winner.year} Winner
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No winners yet, be the first!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserJackpotTab;
