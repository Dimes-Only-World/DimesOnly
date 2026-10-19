import React, { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import NotifyMeDialog from "@/components/rentals/NotifyMeDialog";

const LABELS: Record<string, string> = {
  pending_payment: "Waiting for payment",
  held: "Dates held",
  refundable: "Dates changed — action needed",
  applied: "Applied to booking",
  refund_requested: "Refund in progress",
  refunded: "Refunded",
};
const day = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y!, m! - 1, d!).toLocaleDateString(); };

const MyRentalHolds: React.FC<{ userId: string }> = ({ userId }) => {
  const [holds, setHolds] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const call = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("rental-booking", { body: { userId, ...body } });
    if (error || data?.error) throw new Error(data?.error || "Please try again.");
    return data.data;
  };
  const load = async () => { try { setHolds(await call({ action: "listHolds" })); } catch { /* ignore */ } };

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const holdId = params.get("holdId");
      const token = params.get("token");
      if (holdId && token) {
        try { await call({ action: "captureHold", holdId, paypalOrderId: token }); toast({ title: "Deposit paid", description: "Your dates are held. We'll notify you when the car is ready." }); }
        catch (e: any) { toast({ title: "Deposit not completed", description: e.message, variant: "destructive" }); }
        window.history.replaceState({}, "", window.location.pathname);
      }
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const refund = async (h: any) => {
    if (!window.confirm(`Request a refund of $${Number(h.amount).toFixed(2)}? Your held dates will be released.`)) return;
    setBusy(h.id);
    try {
      const r = await call({ action: "refundHold", holdId: h.id });
      toast({ title: r.status === "refunded" ? "Refund sent" : "Refund requested", description: r.status === "refunded" ? "PayPal is returning your deposit." : "Our team will send your Cash App refund." });
      await load();
    } catch (e: any) { toast({ title: "Refund failed", description: e.message, variant: "destructive" }); }
    finally { setBusy(null); }
  };

  if (!holds.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold flex items-center gap-2"><BellRing className="h-5 w-5 text-primary" /> Notify Me holds</h2>
      {holds.map((h) => {
        const v = h.vehicles || {};
        const title = `${v.year || ""} ${v.make || ""} ${v.model || ""}`.trim() || "Vehicle";
        const canEdit = ["held", "refundable"].includes(h.status);
        return (
          <Card key={h.id} className="bg-card/60 border-border/60">
            <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{title}</p><Badge variant="outline">{LABELS[h.status] || h.status}</Badge></div>
                <p className="text-sm text-muted-foreground">Wanted {day(h.wanted_start)} → {day(h.wanted_end)} · Deposit ${Number(h.amount).toFixed(2)}</p>
                {h.status === "refundable" && <p className="text-sm text-amber-300">The current renter extended. Choose new dates to keep your deposit, or request a refund.</p>}
                {h.status === "pending_payment" && h.payment_method === "cashapp" && <p className="text-xs text-muted-foreground">Send the deposit to $BestCarRentals with code {String(h.id).slice(0, 8).toUpperCase()}.</p>}
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(h)}>Change date</Button>
                  <Button size="sm" variant="destructive" disabled={busy === h.id} onClick={() => refund(h)}>Request refund</Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
      {editing && (
        <NotifyMeDialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }} userId={userId} vehicleId={editing.vehicle_id}
          vehicleTitle={`${editing.vehicles?.year || ""} ${editing.vehicles?.make || ""} ${editing.vehicles?.model || ""}`.trim()} holdId={editing.id} onDone={load} />
      )}
    </section>
  );
};

export default MyRentalHolds;
