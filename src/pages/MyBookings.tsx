import React, { useEffect, useMemo, useState } from "react";
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
import { Car, ArrowLeft, Calendar, MapPin, Star, XCircle } from "lucide-react";

type Booking = {
  id: string;
  vehicle_id: string;
  rental_type: string;
  start_date: string;
  end_date: string | null;
  pickup_location: string | null;
  total_price: number;
  down_payment_amount: number | null;
  status: string;
  created_at: string;
  vehicles?: {
    id: string;
    year: number | null;
    make: string | null;
    model: string | null;
  } | null;
  heroPhoto?: string | null;
  review?: { id: string; rating: number; review_text: string | null } | null;
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
  const [reviewTarget, setReviewTarget] = useState<Booking | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const uid = await resolveUserId();
      if (!uid) {
        toast({ title: "Sign in required", description: "Please log in to view your bookings." });
        navigate("/login");
        return;
      }
      setUserId(uid);
      await loadBookings(uid);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBookings = async (uid: string) => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("rental_bookings")
        .select(
          "id, vehicle_id, rental_type, start_date, end_date, pickup_location, total_price, down_payment_amount, status, created_at, vehicles ( id, year, make, model )"
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
            const { data: s } = await supabase.storage
              .from("vehicle-media")
              .createSignedUrl(first.storage_path, 60 * 60);
            heroPhoto = s?.signedUrl || null;
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
                          i < b.review!.rating
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
                {canCancel(b) && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setCancelTarget(b)}
                  >
                    <XCircle className="w-4 h-4 mr-1" /> Cancel
                  </Button>
                )}
              </div>
            </div>
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
            <h1 className="text-3xl md:text-4xl font-bold">My Bookings</h1>
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

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Loading your bookings…</div>
        ) : bookings.length === 0 ? (
          <Card className="bg-card/60 border-border/60 py-16 text-center">
            <CardContent>
              <Car className="w-14 h-14 mx-auto text-muted-foreground/50 mb-3" />
              <h3 className="text-xl font-semibold mb-1">No bookings yet</h3>
              <p className="text-muted-foreground mb-4">
                When you rent a vehicle it will show up here.
              </p>
              <Button asChild>
                <Link to="/rentals">Browse Rentals</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            <Section title="Active" items={grouped.active} />
            <Section title="Upcoming" items={grouped.upcoming} />
            <Section title="Past" items={grouped.past} />
          </div>
        )}
      </div>

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
