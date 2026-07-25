import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Props {
  userId: string;
  startDate?: string;
  endDate?: string;
}

interface EventCommissionRow {
  id: string;
  amount: number;
  payment_type: string;
  event_id: string | null;
  created_at: string;
  event_name?: string | null;
  buyer_username?: string | null;
}

const EventReferralsTab: React.FC<Props> = ({ userId, startDate, endDate }) => {
  const [rows, setRows] = useState<EventCommissionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!userId) return;
    setLoading(true);
    (async () => {
      let q = supabase
        .from("payments")
        .select("id, amount, payment_type, event_id, created_at, referred_by")
        .eq("user_id", userId)
        .in("payment_type", [
          "event_referral_commission",
          "event_upline_referral_commission",
        ])
        .order("created_at", { ascending: false })
        .limit(200);
      if (startDate) q = q.gte("created_at", `${startDate}T00:00:00Z`);
      if (endDate) q = q.lte("created_at", `${endDate}T23:59:59Z`);

      const { data, error } = await q;
      if (cancelled) return;
      if (error) {
        console.error("Event commissions fetch failed", error);
        setRows([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      const eventIds = Array.from(
        new Set((data ?? []).map((r: any) => r.event_id).filter(Boolean))
      );
      let eventMap: Record<string, string> = {};
      if (eventIds.length) {
        const { data: ev } = await supabase
          .from("events")
          .select("id, name")
          .in("id", eventIds);
        (ev ?? []).forEach((e: any) => {
          eventMap[e.id] = e.name;
        });
      }

      const mapped: EventCommissionRow[] = (data ?? []).map((r: any) => ({
        id: r.id,
        amount: Number(r.amount || 0),
        payment_type: r.payment_type,
        event_id: r.event_id,
        created_at: r.created_at,
        event_name: r.event_id ? eventMap[r.event_id] ?? null : null,
      }));
      setRows(mapped);
      setTotal(mapped.reduce((s, r) => s + r.amount, 0));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, startDate, endDate]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Event Referral Earnings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between rounded-md border bg-yellow-50 p-3">
          <div className="text-sm text-gray-700">
            Total event commissions (20% direct / 10% upline)
          </div>
          <div className="text-lg font-semibold">${total.toFixed(2)}</div>
        </div>

        {loading ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-gray-500">
            No event referral commissions in this period yet.
          </div>
        ) : (
          <div className="divide-y rounded-md border">
            {rows.map((r) => {
              const isDirect = r.payment_type === "event_referral_commission";
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3 gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-medium truncate">
                      <Users className="w-4 h-4 text-gray-500" />
                      {r.event_name || "Event ticket sale"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(r.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={isDirect ? "default" : "secondary"}
                      className={
                        isDirect
                          ? "bg-yellow-400 text-black hover:bg-yellow-400"
                          : ""
                      }
                    >
                      {isDirect ? "Direct 20%" : "Upline 10%"}
                    </Badge>
                    <div className="text-sm font-semibold">
                      ${r.amount.toFixed(2)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EventReferralsTab;
