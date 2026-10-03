import React, { useEffect, useState } from "react";
import { buildAuthUrl } from "@/lib/refCapture";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import AngelLoader from "@/components/AngelLoader";
import { CheckCircle2, CreditCard, ArrowLeft } from "lucide-react";

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

  const paypalToken = searchParams.get("token");

  useEffect(() => {
    (async () => {
      const uid = await resolveUserId();
      setUserId(uid);
      if (!uid) {
        navigate(buildAuthUrl("/login", window.location.pathname));
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
      if (method === "cashapp") {
        const amt = Number(booking.total_price).toFixed(2);
        window.open(`${CASH_APP_URL}/${amt}`, "_blank", "noopener");
      }
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
    <div className="rentals-showroom min-h-screen pb-16 pt-24 sm:px-4">
      <div className="max-w-xl mx-auto">
        <Link to="/rentals" className="mb-4 inline-flex items-center gap-1 px-4 text-sm text-rental-muted hover:text-rental-primary sm:px-0">
          <ArrowLeft className="w-4 h-4" /> Back to rentals
        </Link>

        <Card className="rounded-none border-x-0 border-rental-line bg-rental-surface text-rental-foreground sm:border-x">
          <CardContent className="space-y-6 p-6 sm:p-8">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-rental-primary">Secure checkout</p>
              <h1 className="rentals-wordmark text-4xl">COMPLETE YOUR PAYMENT</h1>
              <p className="text-sm text-rental-muted">
                {v ? `${v.year || ""} ${v.make || ""} ${v.model || ""}` : "Vehicle rental"} · {booking.rental_type}
              </p>
            </div>

            <div className="space-y-2 border-t border-rental-line pt-5 text-sm">
              <div className="flex justify-between">
                <span>Start</span>
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
              {Number(booking.security_deposit) > 0 && (
                <div className="text-rental-muted sm:flex sm:justify-between">
                  <span className="block">Security deposit (authorized before pickup)</span>
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
                  {working ? "Connecting to PayPal..." : `Pay $${Number(booking.total_price).toLocaleString()} with PayPal`}
                </Button>
                <Button variant="outline" className="w-full rounded-none border-rental-line" size="lg" disabled={working} onClick={() => chooseManual("cashapp")}>
                  Pay ${Number(booking.total_price).toLocaleString()} with Cash App
                </Button>
                <Button variant="outline" className="w-full rounded-none border-rental-line" size="lg" disabled={working} onClick={() => chooseManual("cash")}>
                  Pay cash at pickup
                </Button>
                {booking.payment_method === "cashapp" && (
                  <div className="border border-rental-line p-3 text-sm space-y-1">
                    <p className="font-semibold">Cash App instructions</p>
                    <p>Send ${Number(booking.total_price).toFixed(2)} to <a className="underline text-rental-primary" href={CASH_APP_URL} target="_blank" rel="noopener noreferrer">$BestCarRentals</a>.</p>
                    <p>Put booking code <b>{String(bookingId).slice(0, 8).toUpperCase()}</b> in the note. Admin confirms the payment, then your car is marked rented.</p>
                  </div>
                )}
                {booking.payment_method === "cash" && (
                  <div className="border border-rental-line p-3 text-sm space-y-1">
                    <p className="font-semibold">Cash at pickup</p>
                    <p>Bring ${Number(booking.total_price).toFixed(2)} in cash to pickup. Your booking code is <b>{String(bookingId).slice(0, 8).toUpperCase()}</b>. You'll get the keys once admin records the payment.</p>
                  </div>
                )}
                <p className="text-center text-xs text-rental-muted">
                  Pay with PayPal/card, Cash App, or cash at pickup. The car is held for you and marked rented once payment is confirmed.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RentalPayment;
