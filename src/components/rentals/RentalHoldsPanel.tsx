import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

const RentalHoldsPanel: React.FC<{ callAdmin: (action: string, extra?: Record<string, any>) => Promise<any> }> = ({ callAdmin }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [deposit, setDeposit] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { const r = await callAdmin("listHolds"); setRows(r?.data || []); setDeposit(String(r?.depositAmount ?? 150)); }
    catch (e: any) { toast({ title: "Holds unavailable", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const saveDeposit = async () => {
    try { await callAdmin("setHoldDeposit", { amount: Number(deposit) }); toast({ title: "Deposit amount saved" }); }
    catch (e: any) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
  };
  const update = async (id: string, status: string, ask: string) => {
    const reference = window.prompt(ask) ?? null;
    if (reference === null) return;
    try { await callAdmin("updateHold", { id, status, reference }); load(); }
    catch (e: any) { toast({ title: "Update failed", description: e.message, variant: "destructive" }); }
  };

  return (
    <div className="space-y-4">
      <Card><CardContent className="flex flex-wrap items-end gap-3 p-4">
        <div className="space-y-1.5"><Label htmlFor="hold-deposit">Notify Me deposit ($)</Label><Input id="hold-deposit" className="w-40" inputMode="decimal" value={deposit} onChange={(e) => setDeposit(e.target.value.replace(/[^0-9.]/g, ""))} /></div>
        <Button onClick={saveDeposit}>Save</Button>
        <p className="text-sm text-muted-foreground">New holds use this amount. It's applied to the renter's final payment.</p>
      </CardContent></Card>
      {loading ? <p className="text-muted-foreground">Loading holds…</p> : !rows.length ? <p className="text-muted-foreground">No holds yet.</p> : rows.map((h) => {
        const v = h.vehicles || {};
        return (
          <Card key={h.id}><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">@{h.username || "member"} · {v.year} {v.make} {v.model}</p><Badge variant="outline">{h.status.replace("_", " ")}</Badge></div>
              <p className="text-sm text-muted-foreground">{h.wanted_start} → {h.wanted_end} · ${Number(h.amount).toFixed(2)} via {h.payment_method === "cashapp" ? "Cash App" : "PayPal"} · Code {String(h.id).slice(0, 8).toUpperCase()}</p>
            </div>
            <div className="flex gap-2">
              {h.status === "pending_payment" && h.payment_method === "cashapp" && <Button size="sm" onClick={() => update(h.id, "held", "Cash App payment ID or sender $cashtag")}>Mark paid</Button>}
              {h.status === "refund_requested" && <Button size="sm" variant="outline" onClick={() => update(h.id, "refunded", "Refund reference (optional)")}>Mark refunded</Button>}
              {h.status === "pending_payment" && <Button size="sm" variant="ghost" onClick={() => update(h.id, "cancelled", "Reason (optional)")}>Cancel</Button>}
            </div>
          </CardContent></Card>
        );
      })}
    </div>
  );
};

export default RentalHoldsPanel;
