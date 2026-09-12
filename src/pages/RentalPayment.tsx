import React, { useEffect, useState } from "react";
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
        navigate("/login");
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
    <div className="rentals-showroom min-h-screen px-4 pb-16 pt-24">
      <div className="max-w-xl mx-auto">
        <Link to="/rentals" className="mb-4 inline-flex items-center gap-1 text-sm text-rental-muted hover:text-rental-primary">
          <ArrowLeft className="w-4 h-4" /> Back to rentals
        </Link>

        <Card className="rounded-none border-rental-line bg-rental-surface text-rental-foreground">
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
                <div className="flex justify-between text-rental-muted">
                  <span>Security deposit (authorized before pickup)</span>
                  <span>${Number(booking.security_deposit).toLocaleString()}</span>
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
                <p className="text-center text-xs text-rental-muted">
                  You can pay with PayPal or a debit/credit card. Your booking is held until payment is completed.
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
