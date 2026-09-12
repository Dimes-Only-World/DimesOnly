import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, CalendarDays, Car, Check, MapPin, Search, ShieldCheck, Sparkles } from "lucide-react";
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
  three_day_rate?: number | null;
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

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setOptionFilter("all");
  };

  useEffect(() => {
    const load = async () => {
      // Fetch vehicles, media, and rented-until rows in parallel
      const [vsRes, mediaRes, rentedRes] = await Promise.all([
        (supabase as any)
          .from("vehicles")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
        (supabase as any)
          .from("vehicle_media")
          .select("vehicle_id, storage_path, sort_order")
          .eq("media_type", "photo")
          .order("sort_order", { ascending: true }),
        (supabase as any).from("v_vehicle_rented_until").select("vehicle_id, rented_until"),
      ]);

      const items: Vehicle[] = vsRes.data || [];

      // Pick first photo per vehicle (already sorted by sort_order)
      const heroPathByVehicle = new Map<string, string>();
      for (const m of mediaRes.data || []) {
        if (!heroPathByVehicle.has(m.vehicle_id)) heroPathByVehicle.set(m.vehicle_id, m.storage_path);
      }

      // One batched signed-URL call for all hero photos
      const paths = Array.from(heroPathByVehicle.values());
      const urlByPath = new Map<string, string>();
      if (paths.length) {
        const { data: signedList } = await supabase.storage
          .from("vehicle-media")
          .createSignedUrls(paths, 60 * 60);
        for (const s of signedList || []) {
          if (s?.path && s?.signedUrl) urlByPath.set(s.path, s.signedUrl);
        }
      }

      const rentedMap = new Map<string, string>(
        (rentedRes.data || []).map((r: any) => [r.vehicle_id, r.rented_until])
      );

      setVehicles(
        items.map((v) => {
          const p = heroPathByVehicle.get(v.id);
          return {
            ...v,
            hero_url: p ? urlByPath.get(p) || null : null,
            rented_until: rentedMap.get(v.id) || null,
          };
        })
      );
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
    <div className="rentals-showroom min-h-screen pb-16">
      <header className="absolute inset-x-0 top-0 z-20 flex items-start justify-between px-4 py-4 sm:px-8 lg:px-12">
        <Link to="/" className="rentals-wordmark text-2xl leading-none text-rental-foreground sm:text-3xl">
          DIMES ONLY
          <span className="block font-barlow text-[9px] font-semibold uppercase text-rental-muted sm:text-[10px]">World</span>
        </Link>
        <div className="rentals-wordmark text-right text-3xl leading-[0.75] text-rental-foreground sm:text-5xl">
          BEST
          <span className="block text-rental-primary">RENTAL CARS</span>
        </div>
      </header>

      <section className="relative min-h-[560px] overflow-hidden bg-rental-background sm:min-h-[680px]">
        {headerVideo ? (
          <BannerVideo src={headerVideo} background className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-rental-surface" />
        )}
        <div className="absolute inset-0 bg-rental-hero" />
        <div className="relative mx-auto flex min-h-[560px] max-w-7xl items-end px-4 pb-12 pt-28 sm:min-h-[680px] sm:px-8 sm:pb-20 lg:px-12">
          <div className="max-w-3xl">
            <p className="mb-3 flex items-center gap-2 font-barlow text-xs font-semibold uppercase text-rental-primary">
              <span className="h-px w-8 bg-rental-primary" /> Dimes Only Rentals
            </p>
            <h1 className="rentals-wordmark text-6xl leading-[0.88] text-rental-foreground sm:text-8xl lg:text-9xl">
              DRIVE THE
              <span className="block text-rental-primary">EXTRAORDINARY.</span>
            </h1>
            <p className="mt-5 max-w-xl font-barlow text-base leading-relaxed text-rental-muted sm:text-lg">
              A curated fleet for every move—from everyday comfort to statement-making luxury.
              Book with clear pricing and drive with confidence.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-none bg-rental-primary font-barlow font-semibold text-rental-primary-foreground hover:bg-rental-primary/90">
                <a href="#fleet">Explore the fleet <ArrowRight className="ml-2 h-4 w-4" /></a>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-none border-rental-line bg-rental-background/50 font-barlow text-rental-foreground hover:bg-rental-surface hover:text-rental-foreground">
                <Link to="/my-bookings">My bookings</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-rental-line bg-rental-surface">
        <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-rental-line px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8 lg:px-12">
          {[
            [ShieldCheck, "Protected trips", "Coverage included"],
            [CalendarDays, "Flexible terms", "Daily to rent-to-own"],
            [Sparkles, "Curated fleet", "Economic, luxury, exotic"],
          ].map(([Icon, title, copy]) => (
            <div key={String(title)} className="flex items-center gap-3 py-5 sm:px-6 first:sm:pl-0">
              <Icon className="h-5 w-5 shrink-0 text-rental-primary" />
              <div className="font-barlow">
                <p className="text-sm font-semibold uppercase text-rental-foreground">{String(title)}</p>
                <p className="text-xs text-rental-muted">{String(copy)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 pt-14 sm:px-8 lg:px-12">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="font-barlow text-xs font-semibold uppercase text-rental-primary">Choose your drive</p>
            <h2 className="rentals-wordmark mt-1 text-5xl text-rental-foreground sm:text-6xl">THE COLLECTION</h2>
          </div>
          <p className="max-w-md font-barlow text-sm text-rental-muted">Every vehicle is presented with transparent rates, availability, pickup details, and longer-trip savings.</p>
        </div>

        <div id="fleet" className="mb-10 grid scroll-mt-4 grid-cols-1 gap-px border border-rental-line bg-rental-line md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-rental-muted" />
            <Input
              aria-label="Search vehicles"
              placeholder="Search make, model, or location"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-14 rounded-none border-0 bg-rental-surface pl-11 font-barlow text-rental-foreground placeholder:text-rental-muted focus-visible:ring-rental-primary"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger aria-label="Filter by vehicle type" className="h-14 rounded-none border-0 bg-rental-surface font-barlow text-rental-foreground focus:ring-rental-primary">
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
            <SelectTrigger aria-label="Filter by rental option" className="h-14 rounded-none border-0 bg-rental-surface font-barlow text-rental-foreground focus:ring-rental-primary">
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
          <p className="py-20 text-center font-barlow text-rental-muted">Preparing the fleet…</p>
        ) : filtered.length === 0 ? (
          <div className="border border-rental-line bg-rental-surface py-20 text-center">
            <Car className="mx-auto mb-4 h-12 w-12 text-rental-muted" />
            <p className="font-barlow text-rental-muted">No vehicles match these filters.</p>
            <Button variant="link" onClick={clearFilters} className="mt-2 text-rental-primary">Clear filters</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
                  className="group overflow-hidden rounded-none border-rental-line bg-rental-surface transition-colors hover:border-rental-primary"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-rental-elevated">
                    {v.hero_url ? (
                      <img
                        loading="lazy"
                        src={v.hero_url}
                        alt={`${v.year} ${v.make} ${v.model}`}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Car className="h-12 w-12 text-rental-muted" />
                      </div>
                    )}
                    {v.availability_status !== "available" && (
                      <div className="absolute right-3 top-3 bg-rental-primary px-3 py-1 font-barlow text-xs font-semibold uppercase text-rental-primary-foreground">
                        Rented
                        {v.rented_until
                          ? ` till ${new Date(v.rented_until).toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}`
                          : ""}
                      </div>
                    )}
                  </div>
                  <CardContent className="space-y-4 p-5 font-barlow">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase text-rental-primary">{v.vehicle_type || "Premium fleet"}</p>
                        <h3 className="mt-1 text-xl font-semibold text-rental-foreground">{v.year} {v.make} {v.model}</h3>
                      </div>
                      {v.availability_status === "available" && <Check className="mt-1 h-4 w-4 text-rental-success" />}
                    </div>
                    {v.pickup_location && (
                      <p className="flex items-center gap-1.5 text-xs text-rental-muted">
                        <MapPin className="h-3.5 w-3.5 text-rental-primary" /> {v.pickup_location}
                      </p>
                    )}
                    {(v as any).three_day_rate > 0 && (
                      <p className="border-l-2 border-rental-success pl-2 text-xs font-medium text-rental-success">
                        3-day rate: ${Number((v as any).three_day_rate).toLocaleString()}/day
                      </p>
                    )}
                    <div className="flex items-end justify-between gap-3 border-t border-rental-line pt-4">
                      <div>
                        <span className="text-[10px] font-semibold uppercase text-rental-muted">Starting at</span>
                        <p className="text-2xl font-semibold text-rental-foreground">
                          ${Number(startingRate).toLocaleString()}
                          <span className="ml-1 text-xs font-normal text-rental-muted">{rateLabel}</span>
                        </p>
                      </div>
                      <Button asChild size="sm" className="rounded-none bg-rental-primary font-semibold text-rental-primary-foreground hover:bg-rental-primary/90">
                        <Link to={`/rentals/${v.id}`}>View car <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="font-barlow"><CapturesGallery limit={12} /></div>
      </main>
    </div>
  );
};

export default Rentals;
