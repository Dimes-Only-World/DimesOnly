import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type Row = {
  id: string; kind: string; username: string | null; amount: number; payment_code: string;
  description: string | null; status: string; created_at: string; cashapp_reference?: string | null;
};

const KIND_LABEL: Record<string, string> = {
  tip: "Tip", event: "Event ticket", store: "Clothing order", membership: "Membership", host_deposit: "Host deposit",
};

export default function AdminCashAppPayments() {
  const { toast } = useToast();
  const [status, setStatus] = useState("pending");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("cashapp-checkout", { body: { action: "list", status } });
    setLoading(false);
    if (error) return toast({ title: "Could not load Cash App payments", variant: "destructive" });
    setRows(data?.payments || []);
  };
  useEffect(() => { load(); }, [status]);

  const act = async (row: Row, action: "confirm" | "reject") => {
    const body: Record<string, unknown> = { action, id: row.id };
    if (action === "confirm") {
      const ref = (refs[row.id] || "").trim();
      if (!ref) return toast({ title: "Enter the Cash App transaction reference first", variant: "destructive" });
      body.cashapp_reference = ref;
    } else {
      const reason = window.prompt("Reason for rejecting (optional)") ?? "";
      body.reason = reason;
    }
    setBusy(row.id);
    const { data, error } = await supabase.functions.invoke("cashapp-checkout", { body });
    setBusy(null);
    if (error || data?.error) return toast({ title: "Action failed", description: data?.error || error?.message, variant: "destructive" });
    toast({ title: action === "confirm" ? "Payment confirmed and fulfilled" : "Payment rejected" });
    load();
  };

  const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
        <CardTitle>Cash App Payments (tips, tickets, store, memberships, deposits)</CardTitle>
        <div className="flex gap-2">
          {["pending", "confirmed", "rejected", "all"].map((s) => (
            <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)}>
              {s[0].toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Check $BestCarRentals for a payment with the matching code in the note, then confirm. Nothing unlocks until you confirm.
          Total shown: <strong>${total.toFixed(2)}</strong>
        </p>
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments.</p>
        ) : rows.map((r) => (
          <div key={r.id} className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              <span><strong>{KIND_LABEL[r.kind] || r.kind}</strong> · @{r.username || "unknown"} · {r.description}</span>
              <span className="font-mono">Code {r.payment_code} · ${Number(r.amount).toFixed(2)}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(r.created_at).toLocaleString()} · {r.status}{r.cashapp_reference ? ` · Ref ${r.cashapp_reference}` : ""}
            </div>
            {r.status === "pending" && (
              <div className="flex flex-wrap gap-2">
                <Input className="max-w-xs" placeholder="Cash App transaction ref"
                  value={refs[r.id] || ""} onChange={(e) => setRefs({ ...refs, [r.id]: e.target.value })} />
                <Button size="sm" disabled={busy === r.id} onClick={() => act(r, "confirm")}>Confirm paid</Button>
                <Button size="sm" variant="destructive" disabled={busy === r.id} onClick={() => act(r, "reject")}>Reject</Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
