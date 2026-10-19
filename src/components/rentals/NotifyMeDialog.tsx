import React, { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import RentalDatePicker from "@/components/rentals/RentalDatePicker";
import { toast } from "@/hooks/use-toast";

const CASH_APP_URL = "https://cash.app/$BestCarRentals";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  vehicleId: string;
  vehicleTitle: string;
  /** When set, the dialog changes the dates of an existing hold instead of paying a new one. */
  holdId?: string;
  onDone?: () => void;
};

const parseDay = (ymd: string) => { const [y, m, d] = ymd.split("-").map(Number); return new Date(y!, (m || 1) - 1, d || 1); };

const NotifyMeDialog: React.FC<Props> = ({ open, onOpenChange, userId, vehicleId, vehicleTitle, holdId, onDone }) => {
  const [info, setInfo] = useState<{ depositAmount: number; firstDate: string } | null>(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [working, setWorking] = useState(false);
  const [cashHold, setCashHold] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStart(""); setEnd(""); setCashHold(null); setInfo(null);
    supabase.functions.invoke("rental-booking", { body: { action: "holdInfo", userId, vehicleId } }).then(({ data }) => {
      if (data?.data) setInfo(data.data);
    });
  }, [open, userId, vehicleId]);

  const from = info ? parseDay(info.firstDate) : new Date();
  const wantedStart = start.slice(0, 10);
  const wantedEnd = end.slice(0, 10);
  const amount = Number(info?.depositAmount || 0);

  const submit = async (method?: "paypal" | "cashapp") => {
    if (!wantedStart || !wantedEnd) { toast({ title: "Pick your dates", description: "Choose the day you want the car and the day you'll return it." }); return; }
    setWorking(true);
    try {
      const origin = window.location.origin;
      const body = holdId
        ? { action: "changeHoldDates", userId, holdId, wantedStart, wantedEnd }
        : { action: "createHold", userId, vehicleId, wantedStart, wantedEnd, holdMethod: method,
            returnUrl: `${origin}/account/my-rentals`, cancelUrl: `${origin}/rentals/${vehicleId}` };
      const { data, error } = await supabase.functions.invoke("rental-booking", { body });
      if (error || data?.error) throw new Error(data?.error || "Something went wrong. Please try again.");
      if (holdId) { toast({ title: "Dates updated", description: "Your deposit stays on hold for the new dates." }); onOpenChange(false); onDone?.(); return; }
      if (method === "paypal" && data.data.approve_url) { window.location.href = data.data.approve_url; return; }
      setCashHold(String(data.data.hold.id).slice(0, 8).toUpperCase());
      onDone?.();
    } catch (e: any) {
      toast({ title: "Couldn't save your hold", description: e.message, variant: "destructive" });
    } finally { setWorking(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><BellRing className="h-5 w-5 text-primary" /> {holdId ? "Choose new dates" : "Notify Me When Available"}</DialogTitle>
          <DialogDescription>{vehicleTitle}{info ? ` · First open day: ${parseDay(info.firstDate).toLocaleDateString()}` : ""}</DialogDescription>
        </DialogHeader>
        {cashHold ? (
          <div className="space-y-3 text-sm">
            <p>Send ${amount.toFixed(2)} to $BestCarRentals and put hold code <b>{cashHold}</b> in the note.</p>
            <p>Admin confirms the payment, then your dates are held. You'll see the hold in My Rentals.</p>
            <Button asChild className="w-full"><a href={`${CASH_APP_URL}/${amount.toFixed(2)}`} target="_blank" rel="noopener noreferrer">Continue to Cash App</a></Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <RentalDatePicker label="Date you want the car" value={start} onChange={(v) => { setStart(v); if (end && end < v) setEnd(""); }} fromDate={from} disabled={!info} />
              <RentalDatePicker label="Return date" value={end} onChange={setEnd} fromDate={start ? new Date(start) : from} disabled={!start} />
            </div>
            {!holdId && (
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm space-y-1">
                <p><b>Hold deposit: ${amount.toFixed(2)}</b></p>
                <p className="text-muted-foreground">We'll notify you when the car is ready. Your deposit counts toward your final payment when you book these dates.</p>
                <p className="text-muted-foreground">If the current renter extends into your dates, you can pick new dates to keep your deposit, or get a refund from My Rentals.</p>
              </div>
            )}
            {holdId ? (
              <Button className="w-full" disabled={working} onClick={() => submit()}>{working ? "Saving…" : "Save new dates"}</Button>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                <Button disabled={working || !info} onClick={() => submit("paypal")}>Pay ${amount.toFixed(2)} with PayPal</Button>
                <Button variant="outline" disabled={working || !info} onClick={() => submit("cashapp")}>Pay with Cash App</Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NotifyMeDialog;
