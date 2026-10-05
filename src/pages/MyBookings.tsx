import { signRentalMedia } from "@/lib/rentalMedia";
import React, { useEffect, useMemo, useState } from "react";
import { buildAuthUrl } from "@/lib/refCapture";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Car, ArrowLeft, Calendar, MapPin, Star, XCircle, CalendarPlus, Download, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { extensionCharge, lateFeeStatus, MAX_EXTENSION_DAYS, rentalIsActiveForExtension } from "@/lib/rentalExtensionRules";
import { Label } from "@/components/ui/label";
import CaptureMomentUploader from "@/components/rentals/CaptureMomentUploader";

type Booking = {
  id: string;
  vehicle_id: string;
  rental_type: string;
  start_date: string;
  end_date: string | null;
  pickup_location: string | null;
  total_price: number;
  down_payment_amount: number | null;
  security_deposit?: number | null;
  status: string;
  created_at: string;
  payment_method?: string | null;
  payment_receipt_path?: string | null;
  vehicles?: {
    id: string;
    year: number | null;
    make: string | null;
    model: string | null;
    day_rate?: number | null;
    three_day_rate?: number | null;
    weekly_rate?: number | null;
    monthly_rate?: number | null;
    down_payment?: number | null;
  } | null;
  heroPhoto?: string | null;
  review?: { id: string; rating: number; review_text: string | null } | null;
};

type RentalExtension = {
  id: string;
  booking_id: string;
  previous_end_date: string;
  new_end_date: string;
  extra_days: number;
  reported_mileage: number;
  extension_price: number;
  transaction_fee: number;
  total_charged: number;
  status: "paid";
  paid_at: string;
  statement_path: string;
  deposit_applied?: number | null;
};

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

const statusMeta = (status: string) => {
  const s = (status || "").toLowerCase();
  if (["pending", "approved", "upcoming"].includes(s))
    return { label: "Upcoming", className: "bg-primary/20 text-primary border-primary/40" };
  if (["active", "in_progress", "picked_up"].includes(s))
    return { label: "Active", className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" };
  if (["completed", "returned", "paid"].includes(s))
    return { label: "Completed", className: "bg-blue-500/20 text-blue-300 border-blue-500/40" };
  if (["cancelled", "canceled", "rejected"].includes(s))
    return { label: "Cancelled", className: "bg-red-500/20 text-red-300 border-red-500/40" };
  return { label: status || "Unknown", className: "bg-muted text-muted-foreground border-border" };
};

const formatDate = (d?: string | null) => {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const MyBookings: React.FC = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [extendTarget, setExtendTarget] = useState<Booking | null>(null);
  const [extendDays, setExtendDays] = useState(1);
  const [reportedMileage, setReportedMileage] = useState("");
  const [useDeposit, setUseDeposit] = useState(true);
  const [extensions, setExtensions] = useState<RentalExtension[]>([]);
  const [successfulExtensionId, setSuccessfulExtensionId] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<Booking | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const uid = await resolveUserId();
      if (!uid) {
        toast({ title: "Sign in required", description: "Please log in to view your bookings." });
        navigate(buildAuthUrl("/login", window.location.pathname));
        return;
      }
      setUserId(uid);
      await Promise.all([loadBookings(uid), loadExtensions()]);
      await captureReturnedExtension(uid);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBookings = async (uid: string) => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("rental_bookings")
        .select(
          "id, vehicle_id, rental_type, start_date, end_date, pickup_location, total_price, down_payment_amount, security_deposit, status, created_at, payment_method, payment_receipt_path, vehicles ( id, year, make, model, day_rate, three_day_rate, weekly_rate, monthly_rate, down_payment )"
        )
        .eq("renter_user_id", uid)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const rows = (data || []) as Booking[];

      // Fetch hero photo & existing review for each booking in parallel
      const enriched = await Promise.all(
        rows.map(async (b) => {
          const [{ data: media }, { data: reviews }] = await Promise.all([
            (supabase as any)
              .from("vehicle_media")
              .select("storage_path, media_type, sort_order")
              .eq("vehicle_id", b.vehicle_id)
              .eq("media_type", "photo")
              .order("sort_order", { ascending: true })
              .limit(1),
            (supabase as any)
              .from("vehicle_reviews")
              .select("id, rating, review_text")
              .eq("booking_id", b.id)
              .maybeSingle(),
          ]);
          let heroPhoto: string | null = null;
          const first = media?.[0];
          if (first?.storage_path) {
            const signed = await signRentalMedia("vehicle-media", [first.storage_path]);
            heroPhoto = signed.get(first.storage_path) || null;
          }
          return { ...b, heroPhoto, review: reviews || null };
        })
      );
      setBookings(enriched);
    } catch (e: any) {
      toast({
        title: "Failed to load bookings",
        description: e.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const invokeExtension = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("rental-extension", { body });
    if (error) {
      let message = error.message;
      try {
        const context = (error as { context?: Response }).context;
        if (context) {
          const payload = await context.json();
          message = payload?.error || message;
        }
      } catch {
        // Keep the function error when its response is not JSON.
      }
      throw new Error(message);
    }
    if (data?.error) throw new Error(data.error);
    return data?.data;
  };

  const loadExtensions = async () => {
    try {
      const data = await invokeExtension({ action: "list" });
      setExtensions((data || []) as RentalExtension[]);
    } catch (error) {
      console.error("Could not load rental extensions", error);
    }
  };

  const captureReturnedExtension = async (uid: string) => {
    const params = new URLSearchParams(window.location.search);
    const extensionId = params.get("extension");
    const paypalOrderId = params.get("token");
    if (!extensionId || !paypalOrderId) return;
    setSubmitting(true);
    try {
      const data = await invokeExtension({ action: "capturePayment", extensionId, paypalOrderId });
      setSuccessfulExtensionId(data.extensionId);
      toast({ title: "Extension payment complete", description: "Your roadside statement is ready to download." });
      await Promise.all([loadBookings(uid), loadExtensions()]);
    } catch (error) {
      toast({
        title: "Extension payment not completed",
        description: error instanceof Error ? error.message : "Your rental was not changed.",
        variant: "destructive",
      });
    } finally {
      window.history.replaceState({}, "", window.location.pathname);
      setSubmitting(false);
    }
  };

  const grouped = useMemo(() => {
    const upcoming: Booking[] = [];
    const active: Booking[] = [];
    const past: Booking[] = [];
    bookings.forEach((b) => {
      const label = statusMeta(b.status).label;
      if (label === "Upcoming") upcoming.push(b);
      else if (label === "Active") active.push(b);
      else past.push(b);
    });
    return { upcoming, active, past };
  }, [bookings]);

  const canCancel = (b: Booking) => statusMeta(b.status).label === "Upcoming";
  const canReview = (b: Booking) =>
    statusMeta(b.status).label === "Completed" && !b.review;
  const canCapture = (b: Booking) => {
    const label = statusMeta(b.status).label;
    return label === "Active" || label === "Completed";
  };

  const canExtend = (b: Booking) => rentalIsActiveForExtension(b.status) && !!b.end_date;

  const depositAvailable = (b: Booking | null) => {
    if (!b) return 0;
    const used = extensions.filter((e) => e.booking_id === b.id).reduce((t, e) => t + Number(e.deposit_applied || 0), 0);
    return Math.max(0, Number(b.security_deposit || 0) - used);
  };
  const daysTooMany = extendDays > MAX_EXTENSION_DAYS;
  const charge = useMemo(() => extensionCharge({
    days: Math.max(1, Math.min(MAX_EXTENSION_DAYS, extendDays)),
    dailyRate: Number(extendTarget?.vehicles?.day_rate || 0),
    dueMs: extendTarget?.end_date ? new Date(extendTarget.end_date).getTime() : Date.now(),
    nowMs: Date.now(),
    depositAvailable: depositAvailable(extendTarget),
    useDeposit,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [extendTarget, extendDays, useDeposit, extensions]);
  const extendCost = charge.extensionPrice;
  const extensionFee = charge.transactionFee;
  const extensionTotal = charge.totalCharged;
  const lateFor = (b: Booking) => b.end_date && statusMeta(b.status).label === "Active"
    ? lateFeeStatus(new Date(b.end_date).getTime(), Date.now(), Number(b.vehicles?.day_rate || 0))
    : null;
  const extensionStartDate = extendTarget?.end_date
    ? new Date(Math.max(new Date(extendTarget.end_date).getTime(), Date.now())).toISOString()
    : null;
  const proposedEndDate = extensionStartDate
    ? new Date(new Date(extensionStartDate).getTime() + extendDays * 86_400_000).toISOString()
    : null;

  const confirmExtend = async () => {
    if (!extendTarget) return;
    const mileage = Number(reportedMileage);
    if (!Number.isInteger(mileage) || mileage <= 0) {
      toast({
        title: "Enter current mileage",
        description: "Mileage must be a whole number greater than the last reported mileage.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const returnUrl = `${window.location.origin}/account/my-rentals`;
      const data = await invokeExtension({
        action: "createPayment",
        bookingId: extendTarget.id,
        extraDays: extendDays,
        reportedMileage: mileage,
        useDeposit,
        returnUrl,
        cancelUrl: returnUrl,
      });
      if (!data?.approveUrl) throw new Error("PayPal checkout is unavailable");
      window.location.assign(data.approveUrl);
    } catch (error) {
      toast({
        title: "Could not start extension payment",
        description: error instanceof Error ? error.message : "Your rental was not changed.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  const downloadStatement = async (extensionId: string) => {
    try {
      const data = await invokeExtension({ action: "downloadStatement", extensionId });
      if (!data?.url) throw new Error("Statement is unavailable");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast({ title: "Download failed", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    }
  };

  const downloadBookingStatement = async (bookingId: string) => {
    try {
      const data = await invokeExtension({ action: "downloadBookingStatement", bookingId });
      if (!data?.url) throw new Error("Statement is unavailable");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast({ title: "Download failed", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    }
  };

  const downloadReceipt = async (bookingId: string) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase.functions.invoke("rental-booking", { body: { action: "downloadReceipt", userId, bookingId } });
      if (error) throw error;
      if (!data?.data?.url) throw new Error(data?.error || "Receipt is unavailable");
      window.open(data.data.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast({ title: "Download failed", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    }
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from("rental_bookings")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", cancelTarget.id);
      if (error) throw error;
      toast({ title: "Booking cancelled" });
      setCancelTarget(null);
      if (userId) await loadBookings(userId);
    } catch (e: any) {
      toast({
        title: "Cancel failed",
        description: e.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const submitReview = async () => {
    if (!reviewTarget || !userId) return;
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from("vehicle_reviews").insert({
        vehicle_id: reviewTarget.vehicle_id,
        booking_id: reviewTarget.id,
        renter_user_id: userId,
        rating,
        review_text: reviewText || null,
      });
      if (error) throw error;
      toast({ title: "Review submitted", description: "Thanks for your feedback!" });
      setReviewTarget(null);
      setRating(5);
      setReviewText("");
      if (userId) await loadBookings(userId);
    } catch (e: any) {
      toast({
        title: "Review failed",
        description: e.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderCard = (b: Booking) => {
    const meta = statusMeta(b.status);
    const v = b.vehicles;
    const title = v ? `${v.year || ""} ${v.make || ""} ${v.model || ""}`.trim() : "Vehicle";
    const paidExtensions = extensions.filter((extension) => extension.booking_id === b.id);
    return (
      <Card
        key={b.id}
        className="bg-card/60 border-border/60 overflow-hidden hover:border-primary/50 transition-colors"
      >
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-0">
          <Link
            to={`/rentals/${b.vehicle_id}`}
            className="relative aspect-video md:aspect-auto md:h-full bg-muted overflow-hidden group"
          >
            {b.heroPhoto ? (
              <img
                src={b.heroPhoto}
                alt={title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Car className="w-10 h-10 text-muted-foreground/60" />
              </div>
            )}
          </Link>

          <CardContent className="p-4 md:p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <Link
                  to={`/rentals/${b.vehicle_id}`}
                  className="text-lg font-semibold hover:text-primary transition-colors"
                >
                  {title || "Vehicle"}
                </Link>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">
                  {b.rental_type?.replace("_", " ")}
                </p>
              </div>
              <Badge variant="outline" className={`${meta.className} border`}>
                {meta.label}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4 text-primary" />
                <span>
                  {formatDate(b.start_date)}
                  {b.end_date ? ` → ${formatDate(b.end_date)}` : ""}
                </span>
              </div>
              {b.pickup_location && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="truncate">{b.pickup_location}</span>
                </div>
              )}
            </div>

            <div className="flex items-end justify-between gap-3 flex-wrap pt-2 border-t border-border/50">
              <div>
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="text-xl font-bold">
                  ${Number(b.total_price || 0).toLocaleString()}
                </div>
                {Number(b.down_payment_amount) > 0 && (
                  <div className="text-xs text-primary">
                    Down: ${Number(b.down_payment_amount).toLocaleString()}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {b.review && (
                  <div className="flex items-center gap-1 text-sm">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < (b.review?.rating || 0)
                            ? "fill-primary text-primary"
                            : "text-muted-foreground/40"
                        }`}
                      />
                    ))}
                  </div>
                )}
                {canReview(b) && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setReviewTarget(b);
                      setRating(5);
                      setReviewText("");
                    }}
                  >
                    <Star className="w-4 h-4 mr-1" /> Leave Review
                  </Button>
                )}
                {canCapture(b) && userId && (
                  <CaptureMomentUploader
                    userId={userId}
                    bookingId={b.id}
                    vehicleId={b.vehicle_id}
                    vehicleTitle={v ? `${v.year || ""} ${v.make || ""} ${v.model || ""}`.trim() : undefined}
                  />
                )}
                {(() => { const l = lateFor(b); return l?.isLate ? (
                  <div className="w-full rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm">
                    <span className="font-bold text-destructive">Vehicle is late</span>{" "}
                    {l.waived ? "— extend today to waive the late fee." : `— late fee due $${l.lateFee.toFixed(2)}`}
                  </div>) : null; })()}
                {canExtend(b) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setExtendTarget(b);
                      setExtendDays(1);
                      setReportedMileage("");
                      setUseDeposit(true);
                    }}
                  >
                    <CalendarPlus className="w-4 h-4 mr-1" /> Extend
                  </Button>
                )}
                {canCancel(b) && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setCancelTarget(b)}
                  >
                    <XCircle className="w-4 h-4 mr-1" /> Cancel
                  </Button>
                )}
                {b.payment_receipt_path && ["cash", "cashapp"].includes(String(b.payment_method)) && (
                  <Button size="sm" variant="outline" onClick={() => downloadReceipt(b.id)}>
                    <Download className="mr-1 h-4 w-4" /> Download receipt
                  </Button>
                )}
                {["paid", "active", "completed", "returned"].includes(String(b.status).toLowerCase()) && (
                  <Button size="sm" variant="outline" onClick={() => downloadBookingStatement(b.id)}>
                    <Download className="mr-1 h-4 w-4" /> Download statement
                  </Button>
                )}
              </div>
            </div>
            {paidExtensions.length > 0 && (
              <div className="border-t border-border/50 pt-3 space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Paid extensions</p>
                {paidExtensions.map((extension) => (
                  <div key={extension.id} className="flex items-center justify-between gap-3 rounded-md border border-border/60 p-3 text-sm">
                    <div>
                      <p className="font-medium">{formatDate(extension.previous_end_date)} → {formatDate(extension.new_end_date)}</p>
                      <p className="text-xs text-muted-foreground">Paid {formatDate(extension.paid_at)} · Odometer {Number(extension.reported_mileage).toLocaleString()} miles</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => downloadStatement(extension.id)}>
                      <Download className="mr-1 h-4 w-4" /> Download statement
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </div>
      </Card>
    );
  };

  const Section = ({ title, items }: { title: string; items: Booking[] }) => {
    if (!items.length) return null;
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground/90">
          {title}{" "}
          <span className="text-sm font-normal text-muted-foreground">({items.length})</span>
        </h2>
        <div className="grid grid-cols-1 gap-4">{items.map(renderCard)}</div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 pt-20 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <Link
              to="/rentals"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-1"
            >
              <ArrowLeft className="w-4 h-4" /> Browse rentals
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold">My Rentals</h1>
            <p className="text-muted-foreground text-sm">
              Manage your upcoming, active, and completed rentals.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/rentals">
              <Car className="w-4 h-4 mr-1" /> Rent Another Car
            </Link>
          </Button>
        </div>

        {successfulExtensionId && (
          <div className="mb-6 flex flex-col gap-3 border border-primary/40 bg-primary/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <div><p className="font-semibold">Payment complete</p><p className="text-sm text-muted-foreground">Your permissive member statement is ready.</p></div>
            </div>
            <Button onClick={() => downloadStatement(successfulExtensionId)}><Download className="mr-2 h-4 w-4" /> Download statement</Button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Loading your bookings…</div>
        ) : (
          <div className="space-y-8">
            {grouped.active.length === 0 && grouped.upcoming.length === 0 && (
              <Card className="bg-card/60 border-border/60 py-12 text-center">
                <CardContent>
                  <Car className="w-14 h-14 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-lg font-semibold">
                    You do not have any active rental.{" "}
                    <Link to="/rentals" className="text-primary underline underline-offset-4 hover:opacity-80">
                      CLICK here
                    </Link>{" "}
                    to rent your vehicle today
                  </p>
                </CardContent>
              </Card>
            )}
            <Section title="Active" items={grouped.active} />
            <Section title="Upcoming" items={grouped.upcoming} />
            <Section title="Past Rentals" items={grouped.past} />
          </div>
        )}
      </div>

      {/* Extend rental */}
      <Dialog
        open={!!extendTarget}
        onOpenChange={(o) => {
          if (!o) {
            setExtendTarget(null);
            setExtendDays(1);
            setReportedMileage("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Extend your rental</DialogTitle>
            <DialogDescription>
              Current return: {formatDate(extendTarget?.end_date)}. Add days and report the vehicle's current mileage.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
            <Label htmlFor="extension-days">Number of additional days</Label>
            <Input
              id="extension-days"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_EXTENSION_DAYS}
              value={extendDays}
              onChange={(e) => setExtendDays(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
            />
            {daysTooMany && <p className="text-xs text-destructive">Extensions can be at most {MAX_EXTENSION_DAYS} days. Enter 28 or fewer to continue.</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reported-mileage">Current odometer mileage</Label>
              <Input id="reported-mileage" type="text" inputMode="numeric" value={reportedMileage ? Number(reportedMileage).toLocaleString("en-US") : ""} onChange={(e) => setReportedMileage(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="Enter the mileage shown in the vehicle" />
            </div>
            <div className="rounded-lg border border-border/60 bg-card/60 p-3 text-sm space-y-1">
              {charge.isLate && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 space-y-1 mb-2">
                  <p className="font-bold text-destructive">Vehicle is late</p>
                  {charge.waived ? (
                    <p className="text-xs">Late fee of ${charge.lateFee.toFixed(2)} waived — you're extending the same day and within 12 hours of the due time.</p>
                  ) : (<>
                    <div className="flex justify-between"><span>Late fee ($100 + {charge.hoursLate} hr × ${charge.hourlyRate.toFixed(2)})</span><span>${charge.lateFeeOwed.toFixed(2)}</span></div>
                    {depositAvailable(extendTarget) > 0 && (
                      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={useDeposit} onChange={(e) => setUseDeposit(e.target.checked)} /> Pay from security deposit (${depositAvailable(extendTarget).toFixed(2)} available)</label>
                    )}
                    {charge.depositApplied > 0 && <div className="flex justify-between text-muted-foreground"><span>Deposit applied</span><span>−${charge.depositApplied.toFixed(2)}</span></div>}
                    <div className="flex justify-between font-semibold"><span>Late fee still due</span><span>${charge.lateFeeRemainder.toFixed(2)}</span></div>
                    <p className="text-xs text-muted-foreground">The late fee must be paid before the extension is authorized.</p>
                  </>)}
                </div>
              )}
              <div className="grid grid-cols-[auto_1fr] gap-x-3 text-muted-foreground">
                <span>Extension dates</span>
                <span className="text-right">{formatDate(extensionStartDate)}</span>
                <span />
                <span className="text-right">→ {formatDate(proposedEndDate)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Extension price</span>
                <span>${extendCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Transaction fee (4.5% + $1.27)</span>
                <span>${extensionFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-border/60 pt-2 text-base font-bold">
                <span>Total due</span><span>${extensionTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setExtendTarget(null);
                setExtendDays(1);
                setReportedMileage("");
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={confirmExtend} disabled={submitting || extendCost <= 0 || !reportedMileage || daysTooMany}>
              {submitting ? "Connecting to PayPal…" : `Pay $${extensionTotal.toFixed(2)} with PayPal`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel confirmation */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel your reservation. If a deposit was paid, admin will reach out about
              any applicable refund per rental terms.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? "Cancelling…" : "Yes, Cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Review dialog */}
      <Dialog open={!!reviewTarget} onOpenChange={(o) => !o && setReviewTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rate your rental</DialogTitle>
            <DialogDescription>
              How was your experience with{" "}
              {reviewTarget?.vehicles
                ? `${reviewTarget.vehicles.year || ""} ${reviewTarget.vehicles.make || ""} ${
                    reviewTarget.vehicles.model || ""
                  }`.trim()
                : "this vehicle"}
              ?
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-center gap-1 py-2">
            {Array.from({ length: 5 }).map((_, i) => {
              const val = i + 1;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => setRating(val)}
                  className="p-1 transition-transform hover:scale-110"
                  aria-label={`${val} star${val > 1 ? "s" : ""}`}
                >
                  <Star
                    className={`w-8 h-8 ${
                      val <= rating
                        ? "fill-primary text-primary"
                        : "text-muted-foreground/40"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          <Textarea
            placeholder="Share details of your experience (optional)"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            rows={4}
          />

          <DialogFooter>
            <Button variant="ghost" onClick={() => setReviewTarget(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submitReview} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyBookings;
