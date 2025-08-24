import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SubscriptionRow {
  id: string;
  user_id: string;
  subscription_id: string;
  tier: string | null;
  cadence: string | null;
  billing_option: string | null;
  cycles_paid: number | null;
  total_cycles: number | null;
  status: string | null;
  next_billing_time: string | null;
  membership_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function SubscriptionsDebug() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id || null;
      setUserId(uid);
      if (!uid) {
        setRows([]);
        return;
      }
      const { data: subs, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", uid)
        .order("updated_at", { ascending: false });
      if (error) {
        setError(error.message);
        setRows([]);
        return;
      }
      setRows((subs || []) as unknown as SubscriptionRow[]);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mx-auto max-w-3xl p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Subscriptions Debug</CardTitle>
              <CardDescription>Inspect your current subscription rows (RLS protected)</CardDescription>
            </div>
            <Button size="sm" onClick={load} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</Button>
          </div>
        </CardHeader>
        <CardContent>
          {!userId && (
            <div className="text-sm text-slate-600 mb-4">You are not logged in.</div>
          )}
          {error && (
            <div className="text-sm text-red-600 mb-4">{error}</div>
          )}
          {rows.length === 0 ? (
            <div className="text-sm text-slate-600">No subscription rows found.</div>
          ) : (
            <div className="space-y-4">
              {rows.map((r) => (
                <div key={r.id} className="p-3 rounded border bg-slate-50">
                  <div className="text-xs text-slate-500">subscription_id</div>
                  <div className="font-mono text-sm break-all">{r.subscription_id}</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2 text-sm">
                    <div><span className="text-slate-500">tier:</span> {r.tier || "-"}</div>
                    <div><span className="text-slate-500">cadence:</span> {r.cadence || "-"}</div>
                    <div><span className="text-slate-500">billing:</span> {r.billing_option || "-"}</div>
                    <div><span className="text-slate-500">status:</span> {r.status || "-"}</div>
                    <div><span className="text-slate-500">cycles_paid:</span> {r.cycles_paid ?? 0}</div>
                    <div><span className="text-slate-500">total_cycles:</span> {r.total_cycles ?? "-"}</div>
                    <div><span className="text-slate-500">next_billing_time:</span> {r.next_billing_time || "-"}</div>
                    <div><span className="text-slate-500">membership_expires_at:</span> {r.membership_expires_at || "-"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
