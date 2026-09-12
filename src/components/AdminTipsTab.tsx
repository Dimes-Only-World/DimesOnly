import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, DollarSign, Loader2, Search, Trophy, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAdminUserId } from "@/lib/adminAuth";
import { useToast } from "@/hooks/use-toast";

interface LeaderRow {
  user_id: string;
  username: string;
  profile_photo: string | null;
  city: string | null;
  state: string | null;
  total_tipped: number | string;
  tip_count?: number;
}

interface ProfileRow {
  id: string;
  username: string;
  profile_photo: string | null;
  city: string | null;
  state: string | null;
  user_type: string | null;
}

const money = (value: number | string) =>
  Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const AdminTipsTab: React.FC = () => {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [loading, setLoading] = useState(true);
  const [topDimes, setTopDimes] = useState<LeaderRow[]>([]);
  const [topTippers, setTopTippers] = useState<LeaderRow[]>([]);

  const [term, setTerm] = useState("");
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [recipient, setRecipient] = useState<ProfileRow | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const years = useMemo(
    () => [currentYear, currentYear - 1, currentYear - 2],
    [currentYear]
  );

  const callAdmin = useCallback(
    async (action: string, params: Record<string, unknown> = {}) => {
      const adminUserId = getAdminUserId();
      if (!adminUserId) throw new Error("Admin session expired. Please sign in again.");
      const { data, error } = await supabase.functions.invoke("admin-data", {
        body: { action, adminUserId, ...params },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      return (data as { data: unknown }).data;
    },
    []
  );

  const loadLeaderboard = useCallback(
    async (targetYear: number) => {
      setLoading(true);
      try {
        const data = (await callAdmin("fetchTipLeaderboard", { year: targetYear })) as {
          topDimes: LeaderRow[];
          topTippers: LeaderRow[];
        };
        setTopDimes(data.topDimes || []);
        setTopTippers(data.topTippers || []);
      } catch (error) {
        toast({
          title: "Could not load tip standings",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [callAdmin, toast]
  );

  useEffect(() => {
    loadLeaderboard(year);
  }, [year, loadLeaderboard]);

  const searchProfiles = async () => {
    setSearching(true);
    try {
      const data = (await callAdmin("searchTipProfiles", { term })) as ProfileRow[];
      setProfiles(data || []);
    } catch (error) {
      toast({
        title: "Search failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  const sendTip = async () => {
    const value = Number(amount);
    if (!recipient) {
      toast({ title: "Pick a profile to tip", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(value) || value < 5 || value > 1000) {
      toast({ title: "Enter an amount between $5 and $1,000", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      await callAdmin("adminSendTip", {
        tippedUsername: recipient.username,
        amount: value,
        message: note,
      });
      toast({
        title: "Tip sent",
        description: `${money(value)} tipped to @${recipient.username}.`,
      });
      setAmount("");
      setNote("");
      loadLeaderboard(year);
    } catch (error) {
      toast({
        title: "Tip failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const renderTable = (rows: LeaderRow[], label: string) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wider text-gray-500">
            <th className="py-2 pr-3">#</th>
            <th className="py-2 pr-3">Profile</th>
            <th className="py-2 pr-3">{label}</th>
            <th className="py-2 pr-3">Tips</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-gray-500">
                No activity for {year}.
              </td>
            </tr>
          )}
          {rows.map((row, index) => (
            <tr key={`${row.user_id}-${index}`} className="border-b last:border-0">
              <td className="py-2 pr-3 font-bold text-gray-700">{index + 1}</td>
              <td className="py-2 pr-3">
                <div className="font-semibold text-gray-900">@{row.username}</div>
                {(row.city || row.state) && (
                  <div className="text-xs text-gray-500">
                    {[row.city, row.state].filter(Boolean).join(", ")}
                  </div>
                )}
              </td>
              <td className="py-2 pr-3 font-bold text-green-700">{money(row.total_tipped)}</td>
              <td className="py-2 pr-3 text-gray-600">{row.tip_count ?? "—"}</td>
              <td className="py-2 text-right">
                {label === "Received" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setRecipient({
                        id: row.user_id,
                        username: row.username,
                        profile_photo: row.profile_photo,
                        city: row.city,
                        state: row.state,
                        user_type: null,
                      })
                    }
                  >
                    Tip
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-600">Season year:</span>
        {years.map((y) => (
          <Button
            key={y}
            size="sm"
            variant={y === year ? "default" : "outline"}
            onClick={() => setYear(y)}
          >
            {y}
          </Button>
        ))}
        {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Highest Tipped Dimes — {year}
            </CardTitle>
          </CardHeader>
          <CardContent>{renderTable(topDimes, "Received")}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Crown className="h-5 w-5 text-purple-500" />
              Highest Tippers — {year}
            </CardTitle>
          </CardHeader>
          <CardContent>{renderTable(topTippers, "Sent")}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Send className="h-5 w-5 text-pink-600" />
            Send a Tip to Any Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchProfiles()}
                placeholder="Search username..."
                className="pl-9"
              />
            </div>
            <Button onClick={searchProfiles} disabled={searching}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </div>

          {profiles.length > 0 && (
            <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
              {profiles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => setRecipient(profile)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    recipient?.username === profile.username
                      ? "border-pink-500 bg-pink-50"
                      : "border-gray-200 hover:border-pink-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="font-semibold text-gray-900">@{profile.username}</div>
                  <div className="text-xs text-gray-500">
                    {[profile.city, profile.state].filter(Boolean).join(", ") || "—"}
                  </div>
                </button>
              ))}
            </div>
          )}

          {recipient && (
            <div className="rounded-lg border border-pink-200 bg-pink-50 p-4">
              <div className="text-xs uppercase tracking-wider text-pink-600">Tipping</div>
              <div className="text-lg font-bold text-gray-900">@{recipient.username}</div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Amount ($5 – $1,000)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="0.00"
                  inputMode="decimal"
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Message (optional)
              </label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={200}
                placeholder="From the Dimes Only team"
              />
            </div>
          </div>

          <Button
            onClick={sendTip}
            disabled={sending || !recipient}
            className="bg-pink-600 hover:bg-pink-700"
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Tip
              </>
            )}
          </Button>

          <p className="text-xs text-gray-500">
            Admin tips run through the same payout and jackpot rules as member tips and appear
            immediately in the standings above.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTipsTab;
