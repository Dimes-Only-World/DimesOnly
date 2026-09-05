import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Car, MapPin, DollarSign } from "lucide-react";
import BannerVideo from "@/components/BannerVideo";
import { usePageVideo } from "@/hooks/usePageVideo";
import CapturesGallery from "@/components/rentals/CapturesGallery";

interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  vehicle_type: string | null;
  pickup_location: string | null;
  day_rate: number | null;
  weekly_rate: number | null;
  monthly_rate: number | null;
  down_payment: number | null;
  rental_options: string[];
  availability_status: string;
  hero_url?: string | null;
  rented_until?: string | null;
}

const Rentals: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [optionFilter, setOptionFilter] = useState<string>("all");
  const { videoUrl: headerVideo } = usePageVideo("rentals_page");

  useEffect(() => {
    const load = async () => {
      const { data: vs } = await (supabase as any)
        .from("vehicles")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      const items: Vehicle[] = vs || [];
      // Fetch hero photo per vehicle
      const withMedia = await Promise.all(
        items.map(async (v) => {
          const { data: media } = await (supabase as any)
            .from("vehicle_media")
            .select("storage_path")
            .eq("vehicle_id", v.id)
            .eq("media_type", "photo")
            .order("sort_order", { ascending: true })
            .limit(1);
          const path = media?.[0]?.storage_path;
          if (path) {
            const { data: signed } = await supabase.storage
              .from("vehicle-media")
              .createSignedUrl(path, 60 * 60);
            return { ...v, hero_url: signed?.signedUrl || null };
          }
          return { ...v, hero_url: null };
        })
      );
      const { data: rentedRows } = await (supabase as any)
        .from("v_vehicle_rented_until")
        .select("vehicle_id, rented_until");
      const rentedMap = new Map<string, string>(
        (rentedRows || []).map((r: any) => [r.vehicle_id, r.rented_until])
      );

      setVehicles(withMedia.map((v) => ({ ...v, rented_until: rentedMap.get(v.id) || null })));
      setLoading(false);
    };
    load();
  }, []);

  const types = useMemo(
    () => Array.from(new Set(vehicles.map((v) => v.vehicle_type).filter(Boolean))) as string[],
    [vehicles]
  );

  const filtered = vehicles.filter((v) => {
    const q = search.toLowerCase();
    const matchQ =
      !q ||
      `${v.year} ${v.make} ${v.model}`.toLowerCase().includes(q) ||
      (v.pickup_location || "").toLowerCase().includes(q);
    const matchType = typeFilter === "all" || v.vehicle_type === typeFilter;
    const matchOpt = optionFilter === "all" || v.rental_options?.includes(optionFilter);
    return matchQ && matchType && matchOpt;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 pb-16">
      {headerVideo && (
        <div className="w-screen relative left-1/2 -translate-x-1/2 overflow-hidden -mt-px">
          <BannerVideo src={headerVideo} />
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 pt-8">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl mb-8">
          <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />

          <div className="relative px-6 py-10 md:px-12 md:py-14 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              <Car className="h-3.5 w-3.5" />
              Dimes Only Rentals
            </div>

            <h1 className="mt-5 text-4xl md:text-6xl font-black tracking-tight text-foreground">
              Best Rental Cars
              <span className="mt-2 block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                at Dimes Only
              </span>
            </h1>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {["Economic", "Luxury", "Exotic"].map((tier) => (
                <span
                  key={tier}
                  className="rounded-full border border-border/60 bg-background/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  {tier}
                </span>
              ))}
            </div>

            <p className="mx-auto mt-5 max-w-2xl text-sm md:text-base leading-relaxed text-muted-foreground">
              Rent the ride you deserve — daily, weekly, monthly, long-term, or rent-to-own.
              Transparent rates, premium vehicles, and pickup where you need it.
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="font-semibold">
                <a href="#fleet">Browse the Fleet</a>
              </Button>
              <Button asChild size="lg" variant="outline" className="font-semibold">
                <Link to="/my-bookings">View My Bookings</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Filters */}
        <div
          id="fleet"
          className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8 rounded-xl border border-border/50 bg-card/40 backdrop-blur p-3 scroll-mt-8"
        >
          <Input
            placeholder="Search year, make, model, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="md:col-span-2 bg-background/50"
          />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="bg-background/50">
              <SelectValue placeholder="Vehicle type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {types.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={optionFilter} onValueChange={setOptionFilter}>
            <SelectTrigger className="bg-background/50">
              <SelectValue placeholder="Rental option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All options</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="long_term">Long-term</SelectItem>
              <SelectItem value="rent_to_own">Rent-to-Own</SelectItem>
            </SelectContent>
          </Select>
        </div>


        {loading ? (
          <p className="text-center text-muted-foreground py-16">Loading vehicles...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Car className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No vehicles available right now. Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((v) => {
              const rateFor = (opt: string): { amount: number; label: string } | null => {
                if (opt === "daily" && v.day_rate) return { amount: v.day_rate, label: "/day" };
                if (opt === "weekly" && v.weekly_rate) return { amount: v.weekly_rate, label: "/week" };
                if (opt === "monthly" && v.monthly_rate) return { amount: v.monthly_rate, label: "/month" };
                if (opt === "long_term" && v.down_payment) return { amount: v.down_payment, label: " down" };
                if (opt === "rent_to_own" && v.down_payment) return { amount: v.down_payment, label: " down" };
                return null;
              };
              const preferred =
                optionFilter !== "all" ? rateFor(optionFilter) : null;
              const fallback =
                rateFor("daily") ||
                rateFor("weekly") ||
                rateFor("monthly") ||
                rateFor("long_term") ||
                { amount: 0, label: "" };
              const { amount: startingRate, label: rateLabel } = preferred || fallback;
              return (
                <Card
                  key={v.id}
                  className="overflow-hidden bg-card/60 backdrop-blur border-border/50 hover:border-primary/60 transition-all group"
                >
                  <div className="aspect-video bg-muted relative overflow-hidden">
                    {v.hero_url ? (
                      <img
                        src={v.hero_url}
                        alt={`${v.year} ${v.make} ${v.model}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Car className="w-12 h-12 text-muted-foreground/40" />
                      </div>
                    )}
                    {v.availability_status !== "available" && (
                      <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded">
                        {v.availability_status}
                        {v.rented_until
                          ? ` till ${new Date(v.rented_until).toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}`
                          : ""}
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {v.year} {v.make} {v.model}
                    </h3>
                    {v.pickup_location && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {v.pickup_location}
                      </p>
                    )}
                    {(v as any).three_day_rate > 0 && (
                      <p className="text-xs font-medium text-emerald-400">
                        3+ days: ${Number((v as any).three_day_rate).toLocaleString()}/day
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-2">
                      <div>
                        <span className="text-xs text-muted-foreground">from</span>
                        <p className="text-lg font-bold text-primary">
                          <DollarSign className="w-4 h-4 inline" />
                          {Number(startingRate).toLocaleString()}
                          <span className="text-xs text-muted-foreground">{rateLabel}</span>
                        </p>
                      </div>

                      <Link to={`/rentals/${v.id}`}>
                        <Button size="sm">View Details</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <CapturesGallery limit={12} />
      </div>
    </div>
  );
};

export default Rentals;
