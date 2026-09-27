import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAdminUserId } from "@/lib/adminAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, ShieldCheck, ShieldOff } from "lucide-react";

type Control = {
  enabled: boolean;
  monthly_credit_limit: number;
  credits_per_check: number;
  period_month: string;
  checks_this_month: number;
  credits_this_month: number;
  skipped_this_month: number;
  alerts_reached: number[];
  paused_at: string | null;
};

const AdminSelfieCheckTab: React.FC = () => {
  const { toast } = useToast();
  const [c, setC] = useState<Control | null>(null);
  const [limit, setLimit] = useState("");
  const [busy, setBusy] = useState(false);

  const call = useCallback(async (action: string, payload: Record<string, unknown> = {}) => {
    const adminUserId = getAdminUserId();
    if (!adminUserId) throw new Error("Admin session not found");
    const { data, error } = await supabase.functions.invoke("admin-data", { body: { action, adminUserId, ...payload } });
    if (error) throw error;
    return data?.data as Control;
  }, []);

  const load = useCallback(async () => {
    try {
      const d = await call("getSelfieCheckControl");
      setC(d);
      setLimit(String(d?.monthly_credit_limit ?? ""));
    } catch (e: any) {
      toast({ title: "Couldn't load selfie check settings", description: e.message, variant: "destructive" });
    }
  }, [call, toast]);

  useEffect(() => { load(); }, [load]);

  const update = async (payload: Record<string, unknown>, done: string) => {
    setBusy(true);
    try {
      const d = await call("updateSelfieCheckControl", payload);
      setC(d);
      setLimit(String(d?.monthly_credit_limit ?? ""));
      toast({ title: done });
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (!c) return <p className="text-muted-foreground p-4">Loading…</p>;

  const used = Number(c.credits_this_month);
  const max = Number(c.monthly_credit_limit);
  const pct = max > 0 ? Math.min(100, (used / max) * 100) : 100;
  const topAlert = Math.max(0, ...(c.alerts_reached ?? []));

  return (
    <Card className="bg-card text-card-foreground max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {c.enabled ? <ShieldCheck className="h-5 w-5 text-primary" /> : <ShieldOff className="h-5 w-5 text-destructive" />}
          AI Selfie Check — {c.enabled ? "On" : "Paused"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {!c.enabled && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
            AI checks are paused{c.paused_at ? ` since ${new Date(c.paused_at).toLocaleString()}` : ""}. Any picture is accepted
            until you turn AI checks back on.
          </div>
        )}
        {c.enabled && topAlert >= 50 && (
          <div className="flex items-start gap-2 rounded-md border border-primary/50 bg-primary/10 p-3 text-sm">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-primary" />
            Cost alert: {topAlert}% of this month's AI selfie budget has been used.
          </div>
        )}

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Estimated credits used ({c.period_month})</span>
            <span className="font-mono">{used.toFixed(1)} / {max}</span>
          </div>
          <Progress value={pct} />
          <div className="grid grid-cols-3 gap-2 text-center text-sm pt-2">
            <div><div className="font-mono text-lg">{c.checks_this_month}</div><div className="text-muted-foreground">AI checks</div></div>
            <div><div className="font-mono text-lg">{c.skipped_this_month}</div><div className="text-muted-foreground">Let through unchecked</div></div>
            <div><div className="font-mono text-lg">~{Number(c.credits_per_check)}</div><div className="text-muted-foreground">Credits per check</div></div>
          </div>
          <p className="text-xs text-muted-foreground">
            Alerts show here at 50%, 80% and 100%. At 100% AI checks pause automatically. Credits are an estimate; exact
            charges are in Lovable Settings → Usage.
          </p>
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="text-sm">Monthly credit limit</label>
            <Input type="number" min={1} value={limit} onChange={(e) => setLimit(e.target.value)} />
          </div>
          <Button disabled={busy} onClick={() => update({ monthlyCreditLimit: Number(limit) }, "Limit saved")}>Save limit</Button>
        </div>

        {c.enabled ? (
          <Button variant="outline" disabled={busy} onClick={() => update({ enabled: false }, "AI checks paused")}>
            Pause AI checks now
          </Button>
        ) : (
          <Button disabled={busy} onClick={() => update({ enabled: true }, "AI checks turned back on")}>
            Turn AI checks back on (starts a fresh count)
          </Button>
        )}
        <div>
          <Button variant="ghost" size="sm" onClick={load}>Refresh</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminSelfieCheckTab;
