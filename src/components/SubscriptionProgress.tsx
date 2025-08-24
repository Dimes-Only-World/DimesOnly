import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Props {
  userId?: string;
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  subscription_id: string;
  tier: string;
  cadence: string;
  billing_option: string | null;
  cycles_paid: number;
  total_cycles: number | null;
  status: string | null;
  next_billing_time: string | null;
  membership_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  } catch {
    return "—";
  }
};

export default function SubscriptionProgress({ userId }: Props) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        let uid = userId;
        if (!uid) {
          const { data } = await supabase.auth.getUser();
          uid = data.user?.id;
        }
        if (!uid) {
          setRows([]);
          return;
        }
        const { data, error } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", uid)
          .order("updated_at", { ascending: false });
        if (error) {
          console.error("subscriptions fetch error", error);
          setError("We couldn't load your subscription right now.");
          setRows([]);
          return;
        }
        setRows((data || []) as SubscriptionRow[]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const diamondYearly = useMemo(() => {
    return rows.find(r => r.tier === "diamond" && r.cadence === "yearly");
  }, [rows]);

  if (loading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Subscription Progress</CardTitle>
          <CardDescription>Loading…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Subscription Progress</CardTitle>
          <CardDescription className="text-red-600">{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-600">Please refresh, or try again later.</div>
        </CardContent>
      </Card>
    );
  }

  if (!diamondYearly) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Subscription Progress</CardTitle>
          <CardDescription>No Diamond yearly subscription found.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <div className="text-sm text-slate-600">Upgrade to Diamond to track your yearly progress here.</div>
            <div>
              <a href="/upgrade">
                <Button size="sm">Upgrade Options</Button>
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const progressLabel = diamondYearly.total_cycles
    ? `${diamondYearly.cycles_paid}/${diamondYearly.total_cycles}`
    : `${diamondYearly.cycles_paid}`;

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Diamond Yearly Subscription</CardTitle>
            <CardDescription>
              {diamondYearly.billing_option === "split" ? "Yearly (Split every 4 months)" : "Yearly (Full)"}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="uppercase">
            {diamondYearly.status || "unknown"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-md border">
            <div className="text-sm text-slate-500">Progress</div>
            <div className="text-2xl font-semibold">{progressLabel}</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-md border">
            <div className="text-sm text-slate-500">Next Billing</div>
            <div className="text-base">{formatDate(diamondYearly.next_billing_time)}</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-md border">
            <div className="text-sm text-slate-500">Membership Expires</div>
            <div className="text-base">{formatDate(diamondYearly.membership_expires_at)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
