import { WIRE_INSTRUCTIONS } from "@/lib/rentalShortTerm";
import React, { useEffect, useState } from "react";
import { buildAuthUrl } from "@/lib/refCapture";
import { useParams, useNavigate, useSearchParams, Link } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import AngelLoader from "@/components/AngelLoader";
import BestLogoBanner from "@/components/rentals/BestLogoBanner";
import { rentalOptionLabel } from "@/lib/rentalLocation";
import { CheckCircle2, CreditCard, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const resolveUserId = async (): Promise<string | null> => {
  try {
    const ud = sessionStorage.getItem("userData");
    if (ud) {
      const parsed = JSON.parse(ud);
      if (parsed?.id) return parsed.id as string;
    }
  } catch {
    /* ignore */
  }
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
};

const RentalPayment: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [manualPaymentDialog, setManualPaymentDialog] = useState<"cash" | "cashapp" | null>(null);

  const paypalToken = searchParams.get("token");

  useEffect(() => {
    (async () => {
      const uid = await resolveUserId();
      setUserId(uid);
      if (!uid) {
        navigate(buildAuthUrl("/login", `/rentals/pay/${bookingId}`));
        return;
      }

      const { data } = await (supabase as any)
        .from("rental_bookings")
        .select("*, vehicles(year, make, model)")
        .eq("id", bookingId)
        .maybeSingle();

      setBooking(data || null);
      if (data && ["paid", "active", "completed"].includes(String(data.status))) setPaid(true);
      setLoading(false);

      // Returning from PayPal approval -> capture the payment
      if (data && paypalToken && !["paid", "active", "completed"].includes(String(data.status))) {
        setWorking(true);
        try {
          const { data: res, error } = await supabase.functions.invoke("rental-booking", {
            body: { action: "capturePayment", userId: uid, bookingId, paypalOrderId: paypalToken },
          });
          if (error) throw new Error(error.message);
          if ((res as any)?.error) throw new Error((res as any).error);
          setPaid(true);
          toast({ title: "Payment complete", description: "Your rental payment was received." });
        } catch (e: any) {
          toast({ title: "Payment not completed", description: e.message || "Try again.", variant: "destructive" });
        } finally {
          setWorking(false);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, paypalToken]);

  const CASH_APP_URL = "https://cash.app/$BestCarRentals";
  const chooseManual = async (method: "cash" | "cashapp") => {
    if (!userId || !bookingId) return;
    setWorking(true);
    try {
      const { data, error } = await supabase.functions.invoke("rental-booking", {
        body: { action: "chooseManualPayment", userId, bookingId, method },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      setBooking((b: any) => ({ ...b, payment_method: method }));
      setManualPaymentDialog(method);
    } catch (e: any) {
      toast({ title: "Could not save choice", description: e.message || "Try again.", variant: "destructive" });
    } finally {
      setWorking(false);
    }
  };

  const startPayment = async () => {
    if (!userId || !bookingId) return;
    setWorking(true);
    try {
      const base = `${window.location.origin}/rentals/pay/${bookingId}`;
      const { data, error } = await supabase.functions.invoke("rental-booking", {
        body: {
          action: "createPayment",
          userId,
          bookingId,
          returnUrl: base,
          cancelUrl: `${base}?cancelled=1`,
        },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      const approve = (data as any)?.data?.approve_url;
      if (!approve) throw new Error("PayPal did not return a checkout link.");
      window.location.href = approve;
    } catch (e: any) {
      toast({ title: "Payment failed to start", description: e.message || "Try again.", variant: "destructive" });
      setWorking(false);
    }
  };

  if (loading) return <AngelLoader variant="fullscreen" className="pt-24" />;

  if (!booking)
    return (
      <div className="min-h-screen pt-24 text-center">
        <p className="mb-4">Booking not found.</p>
        <Link to="/rentals"><Button>Back to Rentals</Button></Link>
      </div>
    );

  const v = booking.vehicles;

  return (
    <div className="rentals-showroom min-h-screen pb-16 sm:px-4">
      <BestLogoBanner />
      <div className="mobile-wall max-w-xl mx-auto px-4 lg:px-0">

        <Card className="rounded-none border-x-0 border-rental-line bg-rental-surface text-rental-foreground sm:border-x">
          <CardContent className="space-y-6 p-6 sm:p-8">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-rental-primary">Secure checkout</p>
              <h1 className="rentals-wordmark text-4xl">COMPLETE YOUR PAYMENT</h1>
              <p className="text-sm text-rental-muted">
                {v ? `${v.year || ""} ${v.make || ""} ${v.model || ""}` : "Vehicle rental"} · {booking.rental_type}
              </p>
            </div>
            {booking.rental_type === "rent_to_own" && (
              <div className="space-y-1 border border-rental-success/60 p-4 text-sm">
                <p className="font-semibold">Lease to own — wire your deposit{v?.down_payment ? ` of $${Number(v.down_payment).toLocaleString()}` : ""}</p>
                <p>Bank: {WIRE_INSTRUCTIONS.bank}</p>
                <p>Account name: {WIRE_INSTRUCTIONS.accountName}</p>
                <p>Domestic routing number: {WIRE_INSTRUCTIONS.routing}</p>
                <p>Account number: {WIRE_INSTRUCTIONS.account}</p>
                <p className="text-rental-muted">Put your name and vehicle in the wire memo.</p>
              </div>
            )}

            <div className="space-y-2 border-t border-rental-line pt-5 text-sm">
              <p className="text-xs font-semibold uppercase text-rental-muted">Booking summary</p>
              <div className="flex justify-between gap-3">
                <span>Vehicle</span>
                <span className="text-right">{v ? `${v.year || ""} ${v.make || ""} ${v.model || ""}` : "Vehicle rental"}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Rate type</span>
                <span className="capitalize">{rentalOptionLabel(String(booking.rental_type || ""))}</span>
              </div>
              {(() => {
                const days = booking.end_date ? Math.max(1, Math.ceil((new Date(booking.end_date).getTime() - new Date(booking.start_date).getTime()) / 86_400_000)) : 1;
                const rent = Math.max(0, Number(booking.total_price || 0) - Number(booking.security_deposit || 0) + Number(booking.discount_amount || 0) + Number(booking.hold_credit || 0));
                return (
                  <div className="flex justify-between gap-3">
                    <span>{days} day{days === 1 ? "" : "s"} × ${(rent / days).toFixed(2)}</span>
                    <span>${rent.toFixed(2)}</span>
                  </div>
                );
              })()}
              {Number(booking.security_deposit) > 0 && (
                <div className="flex justify-between gap-3">
                  <span>Security deposit</span>
                  <span>+${Number(booking.security_deposit).toLocaleString()}</span>
                </div>
              )}
              {Number(booking.hold_credit) > 0 && (
                <div className="flex justify-between gap-3 text-emerald-500">
                  <span>Notify Me deposit credit</span>
                  <span>-${Number(booking.hold_credit).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between gap-3 text-rental-muted">
                <span>Fees</span>
                <span className="text-right">PayPal/card fee added at PayPal · Cash App & 7-11 free</span>
              </div>
              <div className="flex justify-between">
                <span>Pickup</span>
                <span>{new Date(booking.start_date).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Return</span>
                <span>{booking.end_date ? new Date(booking.end_date).toLocaleString() : "—"}</span>
              </div>
              {Number(booking.discount_amount) > 0 && (
                <div className="flex justify-between text-emerald-500">
                  <span>Promo {booking.promo_code}</span>
                  <span>-${Number(booking.discount_amount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-base pt-2">
                <span>Total due</span>
                <span>${Number(booking.total_price).toLocaleString()}</span>
              </div>
              {false && (
                <div className="text-rental-muted sm:flex sm:justify-between">
                  <span className="block">Includes security deposit</span>
                  <span className="mt-1 block font-semibold text-rental-foreground sm:mt-0">${Number(booking.security_deposit).toLocaleString()}</span>
                </div>
              )}
            </div>

            {paid ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-500 font-medium">
                  <CheckCircle2 className="w-5 h-5" /> Payment received
                </div>
                <p className="text-sm text-muted-foreground">
                  Admin will verify your PayPal payment and confirm your pickup details.
                </p>
                 <Button className="w-full rounded-none bg-rental-primary text-rental-primary-foreground hover:bg-rental-primary/90" onClick={() => navigate("/my-bookings")}>View my bookings</Button>
              </div>
            ) : (
              <>
                <Button className="w-full rounded-none bg-rental-primary text-rental-primary-foreground hover:bg-rental-primary/90" size="lg" disabled={working} onClick={startPayment}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  {working ? "Connecting to PayPal..." : `Pay $${Number(booking.total_price).toLocaleString()} with PayPal with Fees`}
                </Button>
                <Button variant="outline" className="w-full rounded-none border-rental-line" size="lg" disabled={working} onClick={() => chooseManual("cashapp")}>
                  Pay ${Number(booking.total_price).toLocaleString()} with Cash App NO FEES
                </Button>
                <Button variant="outline" className="w-full rounded-none border-rental-line" size="lg" disabled={working} onClick={() => chooseManual("cash")}>
                  Pay ${Number(booking.total_price).toLocaleString()} cash at any 7-11
                </Button>
                <p className="text-center text-xs text-rental-muted">
                  Pay with PayPal/Credit or Debit Card, Cash App, or cash at any 7-11. The car is held for you and marked rented once payment is confirmed.
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <div className="mt-8 flex justify-center">
          <Button asChild size="lg" className="gap-2 rounded-none bg-rental-primary text-rental-primary-foreground hover:bg-rental-primary/90">
            <Link to="/rentals"><ArrowLeft className="h-5 w-5" /> Back to Rentals</Link>
          </Button>
        </div>
      </div>

      <Dialog open={manualPaymentDialog !== null} onOpenChange={(open) => !open && setManualPaymentDialog(null)}>
        <DialogContent className="max-w-md border-rental-line bg-rental-background text-rental-foreground">
          <DialogHeader>
            <DialogTitle className="text-rental-foreground">{manualPaymentDialog === "cashapp" ? "Cash App instructions" : "Pay cash at any 7-11"}</DialogTitle>
            <DialogDescription className="text-rental-muted">Booking code {String(bookingId).slice(0, 8).toUpperCase()}</DialogDescription>
          </DialogHeader>
          {manualPaymentDialog === "cashapp" ? (
            <div className="space-y-4 text-sm">
              <p>Send ${Number(booking.total_price).toFixed(2)} to $BestCarRentals.</p>
              <p>Put booking code <b>{String(bookingId).slice(0, 8).toUpperCase()}</b> in the note. Admin confirms the payment, then your car is marked rented.</p>
              <p>We will contact you via text with the pickup location within 1 hour. Business hours are 9 AM–7 PM Monday–Friday and 10 AM–4 PM Saturday. We are closed Sunday.</p>
              <Button asChild className="w-full rounded-none bg-rental-primary text-rental-primary-foreground hover:bg-rental-primary/90">
                <a href={`${CASH_APP_URL}/${Number(booking.total_price).toFixed(2)}`} target="_blank" rel="noopener noreferrer">Continue to Cash App</a>
              </Button>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <p>Total to pay in cash: <b>${Number(booking.total_price).toFixed(2)}</b>{Number(booking.security_deposit) > 0 ? ` (includes $${Number(booking.security_deposit).toLocaleString()} security deposit)` : ""}.</p>
              <p>When you are in front of any 7-11, text <b>"AT 7-11"</b> to <a href="sms:7076401661?&body=AT%207-11" className="font-semibold text-rental-primary underline">707.640.1661</a> to get your barcode to pay.</p>
              <p>Show the barcode to the cashier and pay the amount above. Your booking code is <b>{String(bookingId).slice(0, 8).toUpperCase()}</b>. Admin confirms the payment, then your car is marked rented.</p>
              <Button asChild className="w-full rounded-none bg-rental-primary text-rental-primary-foreground hover:bg-rental-primary/90">
                <a href="sms:7076401661?&body=AT%207-11">Text "AT 7-11" now</a>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RentalPayment;
