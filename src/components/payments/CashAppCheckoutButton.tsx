import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { parseSupabaseFunctionError } from "@/lib/parseSupabaseFunctionError";

export const CASH_APP_TAG = "$BestCarRentals";
const CASH_APP_URL = "https://cash.app/$BestCarRentals";

export type CashAppKind = "tip" | "event" | "store" | "membership" | "host_deposit";

interface Props {
  kind: CashAppKind;
  /** Request body fields for this kind (amounts are re-checked on the server). */
  payload: Record<string, unknown>;
  /** Amount shown on the button before the server confirms it. */
  displayAmount?: number;
  label?: string;
  disabled?: boolean;
  className?: string;
  onCreated?: (payment: { id: string; amount: number; payment_code: string }) => void;
}

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const CashAppCheckoutButton: React.FC<Props> = ({ kind, payload, displayAmount, label, disabled, className, onCreated }) => {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<{ id: string; amount: number; payment_code: string; description?: string } | null>(null);

  const start = async () => {
    setWorking(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("cashapp-checkout", {
        body: { action: "create", kind, ...payload },
      });
      if (error || !data?.success) {
        throw new Error(data?.error || (error ? await parseSupabaseFunctionError(error) : "Could not start Cash App payment"));
      }
      setPayment(data.payment);
      onCreated?.(data.payment);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start Cash App payment");
    } finally {
      setWorking(false);
    }
  };

  const amount = payment ? Number(payment.amount) : displayAmount;

  return (
    <>
      <Button type="button" variant="outline" size="lg" className={className ?? "w-full"} disabled={disabled || working} onClick={start}>
        {working ? "Starting…" : label ?? `Pay ${amount != null ? usd(amount) + " " : ""}with Cash App`}
      </Button>
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}

      <Dialog open={!!payment} onOpenChange={(o) => !o && setPayment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cash App instructions</DialogTitle>
            <DialogDescription>{payment?.description}</DialogDescription>
          </DialogHeader>
          {payment && (
            <div className="space-y-3 text-sm">
              <p>Send <strong>{usd(Number(payment.amount))}</strong> to <strong>{CASH_APP_TAG}</strong>.</p>
              <p>Put payment code <strong className="font-mono">{payment.payment_code}</strong> in the note.</p>
              <p>An admin confirms the payment, then your purchase is unlocked. Nothing is delivered until the payment is confirmed.</p>
              <p className="text-muted-foreground">Business hours are 9 AM–7 PM Monday–Friday and 10 AM–4 PM Saturday. We are closed Sunday.</p>
              <Button asChild className="w-full" size="lg">
                <a href={`${CASH_APP_URL}/${Number(payment.amount).toFixed(2)}`} target="_blank" rel="noopener noreferrer">
                  Continue to Cash App
                </a>
              </Button>
              <p className="text-center text-xs text-muted-foreground">Status: awaiting confirmation</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CashAppCheckoutButton;
