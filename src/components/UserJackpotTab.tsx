import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Trophy, Ticket, Crown, ExternalLink, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/types";

const TICKET_BATCH_SIZE = 30;
const TICKET_FETCH_PAGE_SIZE = 1000;
const TICKET_FETCH_MAX_PAGES = 10;

type UserRow = Tables<"users">;

type PoolRow = {
  pool_id: string;
  status: string;
  total: number;
  period_start: string | null;
  period_end: string | null;
};

type WinnerRole =
  | "tipper"
  | "dime"
  | "referred_dime"
  | "dime_referred_dime"
  | "referred_dime_referrer"
  | "who_referred_tipper";

type WinnerRow = {
  draw_id: string;
  drawn_code: string | null;
  executed_at: string;
  user_id: string | null;
  username: string | null;
  profile_photo: string | null;
  role: WinnerRole;
  place: 1 | 2 | 3;
  percentage: number | null;
  amount: number | null;
  status: "pending" | "approved" | "paid" | "void";
};

type DrawGroup = {
  drawId: string;
  executedAt: string;
  drawnCode: string | null;
  winners: WinnerRow[];
};

interface UserJackpotTabProps {
  userData: UserRow;
}

const placeTitle = (place: WinnerRow["place"]) => {
  if (place === 1) return "1st Place";
  if (place === 2) return "2nd Place";
  return "3rd Place";
};

const roleDisplay = (role: WinnerRow["role"]) => {
  switch (role) {
    case "tipper":
      return "Tipper";
    case "dime":
      return "Dime";
    case "referred_dime":
      return "Referred Dime";
      case "dime_referred_dime":
        return "Dime’s Referrer Referrer";
    case "referred_dime_referrer":
      return "Referrer (2nd Place)";
    case "who_referred_tipper":
      return "Tipper Referrer";
    default:
      return "Winner";
  }
};

const ROLE_SEQUENCE: WinnerRow["role"][] = [
  "tipper",
  "dime",
  "referred_dime",
  "who_referred_tipper",
  "dime_referred_dime",
  "referred_dime_referrer",
];

const ROLE_METADATA: Record<
  WinnerRow["role"],
  { label: string; helper?: string }
> = {
  tipper: { label: "Tipper", helper: "Sent the original tip" },
  dime: { label: "Tipped (Dime)", helper: "Performer who received the tip" },
  referred_dime: {
    label: "Dime’s Referrer",
    helper: "Brought the performer onto the platform",
  },
  who_referred_tipper: {
    label: "Tipper’s Referrer",
    helper: "Invited the tipper",
  },
  dime_referred_dime: {
    label: "Dime’s Referrer Referrer",
    helper: "Second-level referrer on the performer side",
  },
  referred_dime_referrer: {
    label: "Override Recipient",
    helper: "Earned an override on this tip",
  },
};
const formatDate = (value: string, includeTime = false) => {
  const d = new Date(value);
  return includeTime
    ? d.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
};

const UserJackpotTab: React.FC<UserJackpotTabProps> = ({ userData }) => {
  const [currentTickets, setCurrentTickets] = useState<number>(0);
  const [ticketCodes, setTicketCodes] = useState<
    { code: string; created_at: string | null }[]
  >([]);
  const [visibleTicketCount, setVisibleTicketCount] =
    useState<number>(TICKET_BATCH_SIZE);
  const [drawGroups, setDrawGroups] = useState<DrawGroup[]>([]);
  const [userProfiles, setUserProfiles] = useState<
    Record<string, { name: string; avatar_url?: string | null }>
  >({});
  const [currentJackpot, setCurrentJackpot] = useState<number>(0);
  const [poolStatus, setPoolStatus] = useState<string>("open");
  const [poolId, setPoolId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!userData?.id) return;
    (async () => {
      await fetchPool();
      await Promise.all([fetchTicketCodes(), fetchWinners()]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.id]);

  useEffect(() => {
    if (userData?.id && poolId) {
      fetchTicketCodes();
      fetchMyTickets();
    }
  }, [userData?.id, poolId]);

  useEffect(() => {
    if (ticketCodes.length === 0) {
      setVisibleTicketCount(TICKET_BATCH_SIZE);
      return;
    }
    setVisibleTicketCount((prev) =>
      Math.min(ticketCodes.length, Math.max(TICKET_BATCH_SIZE, prev)),
    );
  }, [ticketCodes]);

  const loadTicketPages = async (
    userId: string,
    pool: string,
  ): Promise<{ code: string | null; created_at: string | null }[]> => {
    const pages: { code: string | null; created_at: string | null }[] = [];
    let page = 0;

    while (page < TICKET_FETCH_MAX_PAGES) {
      const from = page * TICKET_FETCH_PAGE_SIZE;
      const to = from + TICKET_FETCH_PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("jackpot_tickets")
        .select("code, created_at")
        .eq("user_id", userId)
        .eq("pool_id", pool)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const rows =
        (data as { code: string | null; created_at: string | null }[]) || [];
      pages.push(...rows);

      if (rows.length < TICKET_FETCH_PAGE_SIZE) break;
      page += 1;
    }

    return pages;
  };

  const fetchPool = async () => {
    try {
      const { data, error } = await supabase
        .from("v_jackpot_active_pool")
        .select("total,status,pool_id,period_start,period_end")
        .single();

      if (error) throw error;

      if (data) {
        const p = data as PoolRow;
        setCurrentJackpot(Number(p.total) || 0);
        setPoolStatus(p.status || "open");
        setPoolId(p.pool_id || null);
      }
    } catch (err) {
      console.error("Error fetching jackpot pool:", err);
      toast({
        title: "Jackpot",
        description: "Could not load current pool.",
        variant: "destructive",
      });
    }
  };

  const fetchMyTickets = async () => {
    try {
      if (!userData?.id || !poolId) {
        setCurrentTickets(0);
        return;
      }

      const rows = await loadTicketPages(userData.id, poolId);
      const uniqueCount = new Set(
        rows.map((row) => row.code).filter(Boolean),
      ).size;

      setCurrentTickets(uniqueCount);
    } catch (err) {
      console.error("Error fetching my tickets (by active pool):", err);
    }
  };

  const fetchTicketCodes = async () => {
    try {
      if (!userData?.id || !poolId) {
        setTicketCodes([]);
        setCurrentTickets(0);
        return;
      }

      const rows = await loadTicketPages(userData.id, poolId);

      const uniqueMap = new Map<string, string | null>();
      rows.forEach((row) => {
        if (!row.code) return;
        if (!uniqueMap.has(row.code)) {
          uniqueMap.set(
            row.code,
            row.created_at ? new Date(row.created_at).toISOString() : null,
          );
        }
      });

      const codes = Array.from(uniqueMap.entries()).map(([code, createdAt]) => ({
        code,
        created_at: createdAt,
      }));

      setTicketCodes(codes);
      setCurrentTickets(codes.length);
      setVisibleTicketCount(Math.min(TICKET_BATCH_SIZE, codes.length));
    } catch (err) {
      console.error("Error fetching ticket codes:", err);
    }
  };

  const buildDisplayName = (u: any) => {
    return u?.username || "";
  };

  const loadProfiles = async (ids: string[]) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, username, first_name, last_name, profile_photo")
        .in("id", ids);
      if (error) throw error;

      const map: Record<string, { name: string; avatar_url?: string | null }> =
        {};
      (data || []).forEach((u: any) => {
        map[u.id] = {
          name: buildDisplayName(u) || u.id,
          avatar_url: u.profile_photo ?? null,
        };
      });

      setUserProfiles((prev) => ({ ...prev, ...map }));
    } catch (err) {
      console.error("Error loading user profiles:", err);
    }
  };

  const fetchWinners = async () => {
    try {
      const { data, error } = await supabase
        .from("v_jackpot_latest_winners")
        .select(
          "draw_id,drawn_code,executed_at,user_id,role,place,percentage,amount,status",
        )
        .order("executed_at", { ascending: false })
        .limit(60);

      if (error) throw error;

      const rows = (data as any[]) || [];

      const groupsMap = new Map<string, DrawGroup>();

      const normalizedRows: WinnerRow[] = rows.map((row) => ({
        draw_id: String(row.draw_id),
        drawn_code: row.drawn_code ?? null,
        executed_at: String(row.executed_at),
        user_id: row.user_id ? String(row.user_id) : null,
        username: null,
        profile_photo: null,
        role: row.role as WinnerRow["role"],
        place: Number(row.place) as WinnerRow["place"],
        percentage:
          row.percentage === null ? null : Number(row.percentage || 0),
        amount: row.amount === null ? null : Number(row.amount || 0),
        status: (row.status ?? "pending") as WinnerRow["status"],
      }));

      normalizedRows.forEach((winner) => {
        const key = winner.draw_id;
        if (!groupsMap.has(key)) {
          groupsMap.set(key, {
            drawId: key,
            executedAt: winner.executed_at,
            drawnCode: winner.drawn_code,
            winners: [],
          });
        }
        groupsMap.get(key)!.winners.push(winner);
      });

      const grouped = Array.from(groupsMap.values()).sort((a, b) => {
        return new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime();
      });

      setDrawGroups(grouped);

      const initialProfiles: Record<
        string,
        { name: string; avatar_url?: string | null }
      > = {};
      normalizedRows.forEach((row) => {
        if (!row.user_id) return;
        initialProfiles[row.user_id] = {
          name: row.username || roleDisplay(row.role) || row.user_id,
          avatar_url: row.profile_photo ?? null,
        };
      });

      if (Object.keys(initialProfiles).length > 0) {
        setUserProfiles((prev) => ({ ...prev, ...initialProfiles }));
      }

      const ids = Array.from(
        new Set(
          normalizedRows
            .map((r) => r.user_id)
            .filter((id): id is string => Boolean(id)),
        ),
      );

      if (ids.length > 0) {
        await loadProfiles(ids);
      }
    } catch (err) {
      console.error("Error fetching winners:", err);
      toast({
        title: "Jackpot",
        description: "Could not load winners.",
        variant: "destructive",
      });
    }
  };

  const formatMoney = (n?: number | null) => {
    const v = Number(n || 0);
    return v.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const displayNameFor = (
    userId: string | null | undefined,
    fallback: string,
  ) => {
    if (userId) {
      const name = userProfiles[userId]?.name;
      if (name && name.trim().length > 0) return name;
    }
    return fallback;
  };

  const latestDraw = useMemo(
    () => (drawGroups.length > 0 ? drawGroups[0] : null),
    [drawGroups],
  );

  const historicalDraws = useMemo(
    () => (drawGroups.length > 1 ? drawGroups.slice(1) : []),
    [drawGroups],
  );

  const latestTicketRecipients = useMemo(() => {
    if (!latestDraw) return [];

    return ROLE_SEQUENCE.reduce<{
      key: string;
      role: WinnerRow["role"];
      name: string;
      avatar?: string | null;
      helper?: string;
    }[]>((acc, role) => {
      const winner = latestDraw.winners.find((w) => w.role === role);
      if (!winner) return acc;

      const meta = ROLE_METADATA[role];
      acc.push({
        key: `${winner.draw_id}-${role}-${winner.user_id ?? "n/a"}`,
        role,
        name: displayNameFor(
          winner.user_id,
          winner.username || meta.label || "Participant",
        ),
        avatar:
          (winner.user_id
            ? userProfiles[winner.user_id]?.avatar_url ?? null
            : winner.profile_photo ?? null),
        helper: meta.helper,
      });
      return acc;
    }, []);
  }, [latestDraw, userProfiles]);

  const latestSections = useMemo(() => {
    if (!latestDraw) return [];
    const buckets: Record<WinnerRow["place"], WinnerRow[]> = {
      1: [],
      2: [],
      3: [],
    };
    latestDraw.winners.forEach((w) => {
      buckets[w.place].push(w);
    });
    return [
      { place: 1 as WinnerRow["place"], winners: buckets[1] },
      { place: 2 as WinnerRow["place"], winners: buckets[2] },
      { place: 3 as WinnerRow["place"], winners: buckets[3] },
    ].filter((section) => section.winners.length > 0);
  }, [latestDraw]);

  const WinnerListItem = (
    winner: WinnerRow,
    includePlaceBadge = true,
  ): React.ReactNode => {
    const fallbackName =
      winner.username ||
      roleDisplay(winner.role) ||
      winner.user_id ||
      "Winner";
    const name = displayNameFor(winner.user_id, fallbackName);
    const avatar =
      (winner.user_id ? userProfiles[winner.user_id]?.avatar_url : undefined) ??
      winner.profile_photo ??
      undefined;
    const placeLabel = placeTitle(winner.place);
    const roleLabel = roleDisplay(winner.role);

    return (
      <div
        key={`${winner.draw_id}-${winner.user_id ?? winner.role}-${winner.place}`}
        className="p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Avatar className="w-12 h-12 flex-shrink-0">
              {avatar ? <AvatarImage src={avatar} alt={name} /> : null}
              <AvatarFallback>
                {(name?.[0] || roleLabel?.[0] || "U").toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-gray-900 truncate">{name}</div>
              <div className="text-xs text-gray-500 capitalize">{roleLabel}</div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3">
            <div className="text-right">
              <div className="text-xl sm:text-2xl font-bold text-green-600 leading-tight">
                ${formatMoney(winner.amount)}
              </div>
              {includePlaceBadge && (
                <Badge variant="outline" className="text-xs mt-1">
                  {placeLabel}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-600 mt-2 pt-2 border-t border-yellow-200/50">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>Won on {formatDate(winner.executed_at)}</span>
            <span>Draw Code: {winner.drawn_code || "—"}</span>
          </div>
        </div>
      </div>
    );
  };

  const visibleTickets = ticketCodes.slice(0, visibleTicketCount);
  const hasMoreTickets = visibleTicketCount < ticketCodes.length;
  const canShowLess = visibleTicketCount > TICKET_BATCH_SIZE;

  return (
    <div className="space-y-6">
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
                {currentTickets}
              </div>
              <div className="text-sm text-gray-600">Tickets This Week</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {poolStatus.toUpperCase()}
              </div>
              <div className="text-sm text-gray-600">Pool Status</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-red-500 via-red-600 to-red-700 text-white">
        <CardContent className="p-8 text-center">
          <div className="mb-4">
            <Crown className="w-16 h-16 mx-auto mb-4 text-red-200" />
            <h2 className="text-4xl font-bold mb-2">JACKPOT</h2>
            <div className="text-6xl font-bold mb-2">
              ${formatMoney(currentJackpot)}
            </div>
            <p className="text-xl text-red-100">Current Jackpot Amount</p>
          </div>

          <div className="bg-white/20 rounded-lg p-4 mb-4">
            <p className="text-lg mb-2">When pool reaches $1,000</p>
            <p className="text-xl font-bold">Saturday 12:00 am drawing</p>
            <p className="text-sm mt-2">
              ${formatMoney(Math.max(0, 1000 - currentJackpot))} to go • One
              code, 1st/2nd/3rd win • Rollover if no match
            </p>
          </div>

          <div className="space-y-2 text-left bg-white/10 rounded-lg p-4">
            <p className="flex items-center gap-2">
              <span>💎</span> Every $1 = 1 ticket (min $5 per tip)
            </p>
            <p className="flex items-center gap-2">
              <span>🎯</span> Weekly drawing (Saturday 12:00 am). If no match,
              100% rolls to next week.
            </p>
            <div className="mt-4 flex flex-col items-center space-y-2">
              <video
                className="w-64 h-64 md:w-80 md:h-80 object-cover rounded-lg shadow-lg border-4 border-yellow-400 hover:border-yellow-300 transition-colors"
                src="https://dimesonlyworld.s3.us-east-2.amazonaws.com/Tip+and+Win+(1).mp4"
                autoPlay
                loop
                muted
                playsInline
                controlsList="nodownload"
                onContextMenu={(e) => e.preventDefault()}
              />
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

      <Card>
        <CardHeader>
          <CardTitle className="flex itemswner:flex-start gap-2">
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
              $1 = 1 ticket • min $5 per tip
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="w-5 h-5" />
            Your Ticket Codes (This Week)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ticketCodes.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {visibleTickets.map((ticket, idx) => (
                  <div
                    key={idx}
                    className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-center"
                  >
                    <Badge
                      variant="secondary"
                      className="justify-center text-sm mb-2"
                    >
                      {ticket.code}
                    </Badge>
                    <div className="text-xs text-neutral-500">
                      {ticket.created_at
                        ? `Bought ${formatDate(ticket.created_at, true)}`
                        : "Purchase time unavailable"}
                    </div>
                  </div>
                ))}
              </div>

              {(hasMoreTickets || canShowLess) && (
                <div className="flex justify-center gap-2 mt-4">
                  {hasMoreTickets && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setVisibleTicketCount((prev) =>
                          Math.min(prev + TICKET_BATCH_SIZE, ticketCodes.length),
                        )
                      }
                    >
                      Show more
                    </Button>
                  )}
                  {canShowLess && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setVisibleTicketCount(TICKET_BATCH_SIZE)}
                    >
                      Show less
                    </Button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-gray-500">
              <Ticket className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No tickets yet. Tip to earn your first ticket!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {latestTicketRecipients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5" />
              Jackpot Ticket Tree
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
            {latestTicketRecipients.map((recipient) => (
                <div
                  key={recipient.key}
                  className="border rounded-lg p-3 bg-gradient-to-r from-yellow-50 to-orange-50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      {recipient.avatar ? (
                        <AvatarImage src={recipient.avatar} alt={recipient.name} />
                      ) : null}
                      <AvatarFallback>
                        {recipient.name.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {recipient.name}
                      </p>
                      <p className="text-xs uppercase tracking-wide text-gray-600">
                        {ROLE_METADATA[recipient.role].label}
                      </p>
                      {recipient.helper ? (
                        <p className="text-xs text-gray-500">{recipient.helper}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-4">
              All recipients share the same ticket code generated by the tip
              that created this draw entry.
            </p>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Latest Winners
          </CardTitle>
        </CardHeader>
        <CardContent>
          {latestDraw ? (
            <div className="space-Y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
                <span>
                  Drawn on {formatDate(latestDraw.executedAt, true)}
                </span>
                <span>Draw Code: {latestDraw.drawnCode || "—"}</span>
              </div>

              {latestSections.map((section) => (
                <section key={section.place} className="space-y-3">
                  <h4 className="text-lg font-semibold text-gray-900">
                    {placeTitle(section.place)}
                  </h4>
                  {section.winners.map((winner) =>
                    WinnerListItem(winner, true),
                  )}
                </section>
              ))}

              {historicalDraws.length === 0 && (
                <p className="text-sm text-gray-500">
                  No previous draws to display yet.
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No winners yet — be the first!</p>
            </div>
          )}
        </CardContent>
      </Card>
      {historicalDraws.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Previous Draw Winners
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="space-y-2">
              {historicalDraws.map((draw) => (
                <AccordionItem key={draw.drawId} value={draw.drawId}>
                  <AccordionTrigger className="text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-2">
                      <span className="font-medium text-gray-900">
                        Drawn on {formatDate(draw.executedAt, true)}
                      </span>
                      <span className="text-sm text-gray-600">
                        Draw Code: {draw.drawnCode || "—"}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {draw.winners.map((winner) =>
                        WinnerListItem(winner, true),
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserJackpotTab;