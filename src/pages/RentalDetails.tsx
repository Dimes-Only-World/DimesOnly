import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Car, MapPin, Gauge, Calendar, ArrowLeft, Upload, Expand, Star } from "lucide-react";
import PhotoLightbox from "@/components/PhotoLightbox";
import ThemedPackageSelector from "@/components/rentals/ThemedPackageSelector";
import CapturesGallery from "@/components/rentals/CapturesGallery";

type Review = {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
};

type Vehicle = any;
type Media = { id: string; media_type: string; storage_path: string; signedUrl?: string };

const priceBreakdown = (v: Vehicle, type: string, start?: string, end?: string) => {
  if (!v) return { unitRate: 0, units: 1, unitLabel: "", total: 0 };
  const startD = start ? new Date(start) : null;
  const endD = end ? new Date(end) : null;
  const days =
    startD && endD ? Math.max(1, Math.ceil((+endD - +startD) / 86400000)) : 1;
  switch (type) {
    case "daily": {
      const unitRate = Number(v.day_rate || 0);
      return { unitRate, units: days, unitLabel: days === 1 ? "day" : "days", total: unitRate * days };
    }
    case "weekly": {
      const unitRate = Number(v.weekly_rate || 0);
      const units = Math.max(1, Math.ceil(days / 7));
      return { unitRate, units, unitLabel: units === 1 ? "week" : "weeks", total: unitRate * units };
    }
    case "monthly": {
      const unitRate = Number(v.monthly_rate || 0);
      const units = Math.max(1, Math.ceil(days / 30));
      return { unitRate, units, unitLabel: units === 1 ? "month" : "months", total: unitRate * units };
    }
    case "long_term":
    case "rent_to_own": {
      const unitRate = Number(v.down_payment || 0);
      return { unitRate, units: 1, unitLabel: "down payment", total: unitRate };
    }
    default:
      return { unitRate: 0, units: 1, unitLabel: "", total: 0 };
  }
};

const rateFor = (v: Vehicle, type: string, start?: string, end?: string) =>
  priceBreakdown(v, type, start, end).total;

const RentalDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [reviews, setReviews] = useState<Review[]>([]);

  // booking form
  const [showBook, setShowBook] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [rentalType, setRentalType] = useState<string>("daily");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [pickup, setPickup] = useState<string>("");
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
  const [signature, setSignature] = useState<string>("");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Resolve current user from custom sessionStorage first, then fall back to Supabase Auth
    (async () => {
      try {
        const userDataStr = sessionStorage.getItem("userData");
        if (userDataStr) {
          const parsed = JSON.parse(userDataStr);
          if (parsed?.id) {
            setUser({ id: parsed.id, email: parsed.email, username: parsed.username });
          }
        }
      } catch {
        /* ignore */
      }
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUser((prev: any) => prev || data.user);
      }
    })();

    (async () => {
      const { data: v } = await (supabase as any).from("vehicles").select("*").eq("id", id).single();
      if (!v) {
        setLoading(false);
        return;
      }
      setVehicle(v);
      setPickup(v.pickup_location || "");
      // Default rental type to first available option
      if (Array.isArray(v.rental_options) && v.rental_options.length) {
        setRentalType(v.rental_options[0]);
      }
      const { data: ms } = await (supabase as any)
        .from("vehicle_media")
        .select("*")
        .eq("vehicle_id", id)
        .order("sort_order", { ascending: true });
      const withUrls = await Promise.all(
        (ms || []).map(async (m: Media) => {
          const { data: s } = await supabase.storage
            .from("vehicle-media")
            .createSignedUrl(m.storage_path, 60 * 60);
          return { ...m, signedUrl: s?.signedUrl };
        })
      );
      setMedia(withUrls);

      const { data: rvs } = await (supabase as any)
        .from("vehicle_reviews")
        .select("id, rating, review_text, created_at")
        .eq("vehicle_id", id)
        .order("created_at", { ascending: false });
      setReviews((rvs || []) as Review[]);

      setLoading(false);
    })();
  }, [id]);

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length
      : 0;

  const breakdown = vehicle
    ? priceBreakdown(vehicle, rentalType, startDate, endDate)
    : { unitRate: 0, units: 1, unitLabel: "", total: 0 };
  const total = breakdown.total;
  const downPayment =
    rentalType === "long_term" || rentalType === "rent_to_own"
      ? Number(vehicle?.down_payment || 0)
      : 0;

  const submitBooking = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please log in to book.", variant: "destructive" });
      navigate("/login");
      return;
    }
    if (!startDate || !signature || !agree || !licenseFile || !insuranceFile) {
      toast({ title: "Missing info", description: "Fill all fields, upload ID + insurance, sign and agree.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const upload = async (file: File, label: string) => {
        const ext = file.name.split(".").pop() || "bin";
        const path = `${user.id}/${crypto.randomUUID()}-${label}.${ext}`;
        const { error } = await supabase.storage.from("rental-documents").upload(path, file, {
          upsert: false,
          contentType: file.type,
        });
        if (error) throw error;
        return path;
      };
      const licensePath = await upload(licenseFile, "license");
      const insurancePath = await upload(insuranceFile, "insurance");

      // Look up referral chain
      const { data: renterRow } = await (supabase as any)
        .from("users")
        .select("referred_by")
        .eq("id", user.id)
        .single();
      const directRef = renterRow?.referred_by || null;
      let uplineRef: string | null = null;
      if (directRef) {
        const { data: refRow } = await (supabase as any)
          .from("users")
          .select("referred_by")
          .ilike("username", directRef)
          .maybeSingle();
        uplineRef = refRow?.referred_by || null;
      }

      const { error: insErr } = await (supabase as any).from("rental_bookings").insert({
        vehicle_id: id,
        renter_user_id: user.id,
        rental_type: rentalType,
        start_date: startDate,
        end_date: endDate || null,
        pickup_location: pickup,
        total_price: total,
        down_payment_amount: downPayment,
        signature_text: signature,
        signed_at: new Date().toISOString(),
        license_path: licensePath,
        insurance_path: insurancePath,
        referrer_username: directRef,
        upline_referrer_username: uplineRef,
        status: "pending",
      });
      if (insErr) throw insErr;
      toast({ title: "Booking submitted", description: "Admin will review and email you next steps." });
      navigate("/dashboard/profile");
    } catch (e: any) {
      toast({ title: "Booking failed", description: e.message || "Try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen pt-24 text-center">Loading...</div>;
  if (!vehicle)
    return (
      <div className="min-h-screen pt-24 text-center">
        <p className="mb-4">Vehicle not found.</p>
        <Link to="/rentals"><Button>Back to Rentals</Button></Link>
      </div>
    );

  const photos = media.filter((m) => m.media_type === "photo");
  const videos = media.filter((m) => m.media_type === "video");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 pt-20 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        <Link to="/rentals" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to rentals
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="space-y-3">
            <div
              className="group relative aspect-video rounded-lg overflow-hidden bg-muted cursor-zoom-in ring-1 ring-border/50 hover:ring-primary/60 transition-all"
              onClick={() => photos.length && (setLightboxIndex(0), setLightboxOpen(true))}
            >
              {photos[0]?.signedUrl ? (
                <>
                  <img
                    src={photos[0].signedUrl}
                    alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1 opacity-90">
                    <Expand className="w-3.5 h-3.5" /> {photos.length} photo{photos.length > 1 ? "s" : ""}
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Car className="w-16 h-16 text-muted-foreground/50" />
                </div>
              )}
            </div>
            {photos.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {photos.slice(1, 9).map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setLightboxIndex(i + 1); setLightboxOpen(true); }}
                    className="relative aspect-square overflow-hidden rounded ring-1 ring-border/40 hover:ring-primary/60 transition-all cursor-zoom-in group"
                  >
                    <img src={p.signedUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </button>
                ))}
                {photos.length > 9 && (
                  <button
                    type="button"
                    onClick={() => { setLightboxIndex(9); setLightboxOpen(true); }}
                    className="aspect-square rounded bg-black/60 text-white text-sm font-medium flex items-center justify-center ring-1 ring-border/40 hover:ring-primary/60"
                  >
                    +{photos.length - 9}
                  </button>
                )}
              </div>
            )}
            {videos.length > 0 && (
              <div className="space-y-2">
                {videos.map((vd) => (
                  <video key={vd.id} src={vd.signedUrl} controls className="w-full rounded-lg" />
                ))}
              </div>
            )}
          </div>

          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h1>
            {vehicle.vehicle_type && (
              <p className="text-primary uppercase text-sm tracking-wider mb-2">{vehicle.vehicle_type}</p>
            )}
            {reviews.length > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.round(avgRating)
                          ? "fill-primary text-primary"
                          : "text-muted-foreground/40"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {avgRating.toFixed(1)} · {reviews.length} review{reviews.length > 1 ? "s" : ""}
                </span>
              </div>
            )}
            {vehicle.description && <p className="text-muted-foreground mb-4">{vehicle.description}</p>}

            <div className="grid grid-cols-2 gap-3 mb-6">
              {vehicle.pickup_location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-primary" /> {vehicle.pickup_location}
                </div>
              )}
              {vehicle.mileage != null && (
                <div className="flex items-center gap-2 text-sm">
                  <Gauge className="w-4 h-4 text-primary" /> {Number(vehicle.mileage).toLocaleString()} mi
                </div>
              )}
            </div>

            <Card className="bg-card/60 border-border/50 mb-6">
              <CardContent className="p-4 space-y-2 text-sm">
                <h3 className="font-semibold mb-2">Rates</h3>
                {vehicle.day_rate && <div className="flex justify-between"><span>Daily</span><span>${Number(vehicle.day_rate).toLocaleString()}</span></div>}
                {vehicle.weekly_rate && <div className="flex justify-between"><span>Weekly</span><span>${Number(vehicle.weekly_rate).toLocaleString()}</span></div>}
                {vehicle.monthly_rate && <div className="flex justify-between"><span>Monthly</span><span>${Number(vehicle.monthly_rate).toLocaleString()}</span></div>}
                {vehicle.down_payment && <div className="flex justify-between"><span>Down (long-term / rent-to-own)</span><span>${Number(vehicle.down_payment).toLocaleString()}</span></div>}
                <div className="pt-2 text-xs text-muted-foreground">
                  Options: {(vehicle.rental_options || []).join(", ") || "—"}
                </div>
              </CardContent>
            </Card>

            {!showBook ? (
              <Button size="lg" className="w-full" onClick={() => setShowBook(true)} disabled={vehicle.availability_status !== "available"}>
                {vehicle.availability_status === "available" ? "Rent This Car" : "Currently Unavailable"}
              </Button>
            ) : (
              <Card className="bg-card/60 border-primary/40">
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-lg font-semibold">Booking Request</h3>

                  <div>
                    <Label>Rental type</Label>
                    <Select value={rentalType} onValueChange={setRentalType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(vehicle.rental_options || ["daily"]).map((o: string) => (
                          <SelectItem key={o} value={o}>{o.replace("_", " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Pickup date/time</Label>
                      <Input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    <div>
                      <Label>Return date/time</Label>
                      <Input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <Label>Pickup location</Label>
                    <Input value={pickup} onChange={(e) => setPickup(e.target.value)} />
                  </div>

                  <div>
                    <Label className="flex items-center gap-1"><Upload className="w-3 h-3" /> Driver's License</Label>
                    <Input type="file" accept="image/*,application/pdf" onChange={(e) => setLicenseFile(e.target.files?.[0] || null)} />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1"><Upload className="w-3 h-3" /> Proof of Insurance</Label>
                    <Input type="file" accept="image/*,application/pdf" onChange={(e) => setInsuranceFile(e.target.files?.[0] || null)} />
                  </div>

                  <div>
                    <Label>Digital signature (type full legal name)</Label>
                    <Input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Full legal name" />
                  </div>

                  <div className="flex items-start gap-2">
                    <Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} id="agree" />
                    <Label htmlFor="agree" className="text-xs leading-snug">
                      I agree to the rental terms and confirm the uploaded documents are authentic.
                    </Label>
                  </div>

                  <div className="border-t pt-3 space-y-1 text-sm">
                    {rentalType !== "long_term" && rentalType !== "rent_to_own" && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>
                          ${breakdown.unitRate.toLocaleString()} × {breakdown.units} {breakdown.unitLabel}
                        </span>
                        <span>${breakdown.total.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Estimated total</span>
                      <span className="font-semibold">${total.toLocaleString()}</span>
                    </div>
                    {downPayment > 0 && (
                      <div className="flex justify-between text-primary">
                        <span>Down payment</span>
                        <span>${downPayment.toLocaleString()}</span>
                      </div>
                    )}
                  </div>


                  <Button className="w-full" onClick={submitBooking} disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit Booking Request"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Admin will review your documents and email you a payment link once approved.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {reviews.length > 0 && (
          <section className="mt-10">
            <h2 className="text-2xl font-semibold mb-4">
              Reviews <span className="text-base text-muted-foreground">({reviews.length})</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((r) => (
                <Card key={r.id} className="bg-card/60 border-border/60">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < r.rating
                                ? "fill-primary text-primary"
                                : "text-muted-foreground/40"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {r.review_text && (
                      <p className="text-sm text-foreground/90">{r.review_text}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>

      <PhotoLightbox
        photos={photos.map((p) => p.signedUrl || "").filter(Boolean)}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
};

export default RentalDetails;
