import fleetBanner from "@/assets/rentals/fleet-banner.jpg";
import { signRentalMedia } from "@/lib/rentalMedia";
import RentalUpdatesCarousel from "@/components/rentals/RentalUpdatesCarousel";
import React, { useEffect, useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, BadgeDollarSign, CalendarDays, Car, Check, MapPin, Search, ShieldCheck, Sparkles } from "lucide-react";
import BannerVideo from "@/components/BannerVideo";
import { usePageVideo } from "@/hooks/usePageVideo";
import CapturesGallery from "@/components/rentals/CapturesGallery";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReferrerBadge from "@/components/rentals/ReferrerBadge";
import { blockedUntil, type BookedRange } from "@/lib/rentalAvailability";
import { formatRentalLocation } from "@/lib/rentalLocation";

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
  booked?: BookedRange[];
}

const Rentals: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [optionFilter, setOptionFilter] = useState<string>("all");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [priceFilter, setPriceFilter] = useState<string>("all");
  const [wantedDate, setWantedDate] = useState<string>("");
  const [page, setPage] = useState(1);
  const gridRef = React.useRef<HTMLDivElement>(null);

  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [gateTarget, setGateTarget] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);
  const gate = (e: React.MouseEvent, target: string) => {
    if (signedIn) return;
    e.preventDefault();
    setGateTarget(target);
  };
  const refParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("ref") : null;

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
      const { data: bookedRows } = await (supabase as any).from("v_vehicle_booked_dates").select("vehicle_id, start_date, end_date").order("start_date");
      const bookedMap = new Map<string, BookedRange[]>();
      for (const r of bookedRows || []) bookedMap.set(r.vehicle_id, [...(bookedMap.get(r.vehicle_id) || []), r]);

      const items: Vehicle[] = vsRes.data || [];

      // Pick first photo per vehicle (already sorted by sort_order)
      const heroPathByVehicle = new Map<string, string>();
      for (const m of mediaRes.data || []) {
        if (!heroPathByVehicle.has(m.vehicle_id)) heroPathByVehicle.set(m.vehicle_id, m.storage_path);
      }

      // One batched signed-URL call for all hero photos
      const paths = Array.from(heroPathByVehicle.values());
      const urlByPath = await signRentalMedia("vehicle-media", paths);

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
            booked: bookedMap.get(v.id) || [],
          };
        })
      );
      setLoading(false);
    };
    load();
  }, []);

  const types = useMemo(() => {
    const base = ["Economy", "Luxury", "Exotic", "SUV", "Truck"];
    const seen = new Set(base.map((t) => t.toLowerCase()));
    for (const t of vehicles.map((v) => v.vehicle_type).filter(Boolean) as string[]) {
      if (!seen.has(t.toLowerCase())) { seen.add(t.toLowerCase()); base.push(t); }
    }
    return base;
  }, [vehicles]);

  const filtered = vehicles.filter((v) => {
    const q = search.toLowerCase();
    const matchQ =
      !q ||
      `${v.year} ${v.make} ${v.model}`.toLowerCase().includes(q) ||
      (v.pickup_location || "").toLowerCase().includes(q);
    const matchType = typeFilter === "all" || (v.vehicle_type || "").toLowerCase().includes(typeFilter.toLowerCase());
    const day = Number(v.day_rate || 0);
    const matchPrice = priceFilter === "all" || (day > 0 && (
      priceFilter === "u100" ? day < 100 : priceFilter === "100-200" ? day >= 100 && day <= 200 : priceFilter === "200-400" ? day > 200 && day <= 400 : day > 400));
    let matchDate = true;
    if (wantedDate) {
      const t = new Date(`${wantedDate}T12:00:00`).getTime();
      matchDate = (v.booked || []).every((b) => {
        const s0 = new Date(b.start_date).getTime() - 3 * 86_400_000;
        const e0 = new Date(b.end_date || b.start_date).getTime();
        return t < s0 || t > e0;
      });
    }
    const matchOpt = optionFilter === "all" || v.rental_options?.includes(optionFilter);
    const matchAvail = !availableOnly || (v.availability_status === "available" && blockedUntil(v.booked || [], Date.now()) === null);
    return matchQ && matchType && matchOpt && matchAvail && matchPrice && matchDate;
  });

  const PER_PAGE = 8;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, optionFilter, availableOnly, priceFilter, wantedDate]);

  const goPage = (n: number) => {
    const next = Math.min(Math.max(1, n), totalPages);
    setPage(next);
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (

    <div className="rentals-showroom min-h-screen">
      <header className="absolute inset-x-0 top-0 z-20 flex items-start justify-between px-4 py-4 sm:px-8 lg:px-12">
        <div>
          <Link to="/" className="rentals-wordmark block text-2xl leading-none text-rental-foreground sm:text-3xl">
            DIMES ONLY
          </Link>
          <ReferrerBadge />
        </div>
        <div className="rentals-wordmark hidden text-right text-2xl leading-[0.75] text-rental-foreground sm:text-5xl">
          BEST
          <span className="block text-rental-primary">RENTAL CARS</span>
        </div>
      </header>

      <section className="relative min-h-[560px] overflow-hidden bg-rental-background sm:min-h-[680px]">
        {headerVideo ? (
          <BannerVideo src={headerVideo} background className="absolute inset-0 h-full w-full object-cover opacity-35" />
        ) : (
          <div className="absolute inset-0 bg-rental-surface" />
        )}
        <div className="absolute inset-0 bg-rental-hero" />
        <div className="relative mx-auto flex min-h-[560px] max-w-7xl flex-col px-4 pb-12 pt-16 sm:min-h-[680px] sm:px-8 sm:pb-20 sm:pt-20 lg:px-12">
          <BestLogoBanner className="z-10" />
          <div className="mt-auto max-w-3xl pt-8">
            <p className="mb-3 flex items-center gap-2 font-barlow text-xs font-semibold uppercase text-rental-primary">
              <span className="h-px w-8 bg-rental-primary" /> Dimes Only Rentals
            </p>
            <h1 className="rentals-wordmark text-[clamp(2.25rem,13.5vw,3rem)] leading-[0.88] text-rental-foreground sm:text-8xl lg:text-9xl">
              DRIVE THE
              <span className="block text-rental-primary">EXTRAORDINARY.</span>
            </h1>
            <p className="mt-5 max-w-xl font-barlow text-base leading-relaxed text-rental-muted sm:text-lg">
              A curated fleet for every move—from everyday comfort to statement-making luxury.
              Book with clear pricing and drive with confidence.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap [&>*]:w-full sm:[&>*]:w-auto">
              <Button asChild size="lg" className="rounded-none bg-rental-primary font-barlow font-semibold text-rental-primary-foreground hover:bg-rental-primary/90">
                <a href="#fleet">Explore the fleet <ArrowRight className="ml-2 h-4 w-4" /></a>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-none border-rental-line bg-rental-background/50 font-barlow text-rental-foreground hover:bg-rental-surface hover:text-rental-foreground">
                <Link to="/account/my-rentals">My Rentals</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-none border-rental-primary bg-rental-background/50 font-barlow text-rental-primary hover:bg-rental-primary hover:text-rental-primary-foreground">
                <Link to="/rentals/purchase"><BadgeDollarSign className="mr-2 h-4 w-4" /> Purchase / Credit App</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-rental-line bg-rental-surface">
        <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-rental-line px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8 lg:px-12">
          {([
            [ShieldCheck, "Protected trips", "Coverage included"],
            [CalendarDays, "Flexible terms", "Daily to rent-to-own"],
            [Sparkles, "Curated fleet", "Economic, luxury, exotic"],
          ] as [React.ComponentType<{ className?: string }>, string, string][]).map(([IconComponent, title, copy]: [React.ComponentType<{ className?: string }>, string, string]) => (
            <div key={String(title)} className="flex items-center gap-3 py-5 sm:px-6 first:sm:pl-0">
              {<IconComponent className="h-5 w-5 shrink-0 text-rental-primary" />}
              <div className="font-barlow">
                <p className="text-sm font-semibold uppercase text-rental-foreground">{String(title)}</p>
                <p className="text-xs text-rental-muted">{String(copy)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <main className="mx-auto max-w-7xl pt-14 sm:px-8 lg:px-12">
        <div className="mb-8 flex flex-col justify-between gap-4 px-4 sm:flex-row sm:items-end sm:px-0">
          <div>
            <p className="font-barlow text-xs font-semibold uppercase text-rental-primary">Choose your drive</p>
            <h2 className="rentals-wordmark mt-1 text-5xl text-rental-foreground sm:text-6xl">THE COLLECTION</h2>
          </div>
          <p className="max-w-md font-barlow text-sm text-rental-muted">Every vehicle is presented with transparent rates, availability, pickup details, and longer-trip savings.</p>
        </div>

        <div className="mb-6 flex flex-col justify-between gap-4 border-y border-rental-primary bg-rental-surface p-5 sm:flex-row sm:items-center sm:border-x">
          <div>
            <p className="font-barlow text-xs font-semibold uppercase text-rental-primary">Vehicle Purchase</p>
            <p className="mt-1 font-barlow text-sm text-rental-muted">Apply for financing even if the vehicle you want is not listed yet.</p>
          </div>
          <Button asChild className="shrink-0 rounded-none bg-rental-primary font-barlow font-semibold text-rental-primary-foreground hover:bg-rental-primary/90">
            <Link to="/rentals/purchase"><BadgeDollarSign className="mr-2 h-4 w-4" /> Start Credit Application</Link>
          </Button>
        </div>
      </main>

      <RentalUpdatesCarousel />

      <section className="relative mt-10 overflow-hidden border-y border-rental-line">
        <img src={fleetBanner} alt="Luxury fleet of cars in a showroom" width={1600} height={800} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-rental-hero" />
        <div className="relative mx-auto flex min-h-[320px] max-w-7xl flex-col items-start justify-end gap-4 px-4 py-10 sm:min-h-[400px] sm:px-8 lg:px-12">
          <h2 className="rentals-wordmark text-[clamp(2.25rem,11vw,4.5rem)] leading-[0.9] text-rental-foreground">
            OWN A FLEET.
            <span className="block text-rental-primary">EARN WITH BEST.</span>
          </h2>
          <Button asChild size="lg" className="w-full rounded-none bg-rental-primary font-barlow font-semibold text-rental-primary-foreground hover:bg-rental-primary/90 sm:w-auto">
            <Link to="/rentals/host">Become a Host <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      <div className="mx-auto max-w-7xl sm:px-8 lg:px-12">


        <div id="fleet" className="mb-10 grid scroll-mt-4 grid-cols-1 gap-px border-y border-rental-line bg-rental-line sm:border-x md:grid-cols-4">
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
              <SelectItem value="purchase">Purchase</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="-mt-10 mb-px grid grid-cols-1 gap-px border-x-0 border-b border-rental-line bg-rental-line sm:grid-cols-2 sm:border-x">
          <Select value={priceFilter} onValueChange={setPriceFilter}>
            <SelectTrigger aria-label="Filter by daily price" className="h-14 rounded-none border-0 bg-rental-surface font-barlow text-rental-foreground focus:ring-rental-primary">
              <SelectValue placeholder="Daily price" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any daily price</SelectItem>
              <SelectItem value="u100">Under $100/day</SelectItem>
              <SelectItem value="100-200">$100–$200/day</SelectItem>
              <SelectItem value="200-400">$200–$400/day</SelectItem>
              <SelectItem value="400+">Over $400/day</SelectItem>
            </SelectContent>
          </Select>
          <label className="flex h-14 items-center gap-3 bg-rental-surface px-4 font-barlow text-sm text-rental-muted">
            <span className="shrink-0 uppercase">Available on</span>
            <input type="date" aria-label="Available on date" value={wantedDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setWantedDate(e.target.value)}
              className="h-10 min-w-0 flex-1 border border-rental-line bg-rental-elevated px-2 text-rental-foreground [color-scheme:dark]" />
          </label>
        </div>
        <div className="mb-10 flex justify-end border-x-0 border-b border-rental-line bg-rental-surface p-3 sm:border-x">
          <button
            type="button"
            aria-pressed={availableOnly}
            onClick={() => setAvailableOnly((v) => !v)}
            className={`flex items-center gap-2 border px-4 py-2 font-barlow text-sm font-semibold uppercase transition-colors ${availableOnly ? "border-rental-success bg-rental-success text-rental-background" : "border-rental-line bg-rental-elevated text-rental-foreground hover:border-rental-success"}`}
          >
            <Check className="h-4 w-4" /> {availableOnly ? "Showing available only" : "Available"}
          </button>
        </div>

        {loading ? (
          <div aria-label="Loading fleet" className="grid grid-cols-1 gap-0 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse border border-rental-line bg-rental-surface">
                <div className="h-12 border-b border-rental-line bg-rental-elevated/40" />
                <div className="aspect-[4/3] bg-rental-elevated" />
                <div className="space-y-3 p-5"><div className="h-3 w-1/3 bg-rental-elevated" /><div className="h-5 w-2/3 bg-rental-elevated" /><div className="h-3 w-1/2 bg-rental-elevated" /><div className="h-9 bg-rental-elevated" /></div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="border border-rental-line bg-rental-surface py-20 text-center">
            <Car className="mx-auto mb-4 h-12 w-12 text-rental-muted" />
            {availableOnly ? (
              <>
                <p className="font-barlow text-lg font-semibold text-rental-foreground">Nothing available right now</p>
                <p className="mt-1 font-barlow text-rental-muted">Click Get Notified on the car you want.</p>
                <Button onClick={() => setAvailableOnly(false)} className="mt-4 rounded-none bg-rental-warning font-semibold text-rental-warning-foreground hover:bg-rental-warning/90">Show all cars</Button>
              </>
            ) : (
              <>
                <p className="font-barlow text-rental-muted">No vehicles match these filters.</p>
                <Button variant="link" onClick={clearFilters} className="mt-2 text-rental-primary">Clear filters</Button>
              </>
            )}
          </div>
        ) : (
          <>
          <div ref={gridRef} className="grid grid-cols-1 gap-0 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {visible.map((v, idx) => {

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
              const purchaseAvailable = v.rental_options?.includes("purchase");
              const blockEnd = blockedUntil(v.booked || [], Date.now());
              const unavailable = v.availability_status !== "available" || blockEnd !== null;
              return (
                <Card
                  key={v.id}
                  className="group flex h-full flex-col overflow-hidden rounded-none border-x-0 border-rental-line bg-rental-surface transition-colors hover:border-rental-primary sm:border-x"
                >
                  <div className="flex items-baseline justify-between gap-2 border-b border-rental-line bg-rental-elevated/40 px-5 py-3 font-barlow">
                    <span className="text-[10px] font-semibold uppercase text-rental-muted">Starting at</span>
                    <p className="text-2xl font-semibold leading-none text-rental-foreground">
                      ${Number(startingRate).toLocaleString()}
                      <span className="ml-1 text-xs font-normal text-rental-muted">{rateLabel}</span>
                    </p>
                  </div>
                  <div className="relative aspect-[4/3] overflow-hidden bg-rental-elevated">

                    {v.hero_url ? (
                      <img
                        loading={idx < 3 ? "eager" : "lazy"}
                        decoding="async"
                        {...({ fetchpriority: idx < 3 ? "high" : "low" } as any)}
                        src={v.hero_url}
                        alt={`${v.year} ${v.make} ${v.model}`}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Car className="h-12 w-12 text-rental-muted" />
                      </div>
                    )}
                    {!unavailable && (
                      <div className="absolute right-3 top-3 bg-rental-success px-3 py-1 font-barlow text-xs font-semibold uppercase text-rental-background">
                        Available
                      </div>
                    )}
                    {unavailable && (
                      <div className="absolute right-3 top-3 bg-rental-primary px-3 py-1 font-barlow text-xs font-semibold uppercase text-rental-primary-foreground">
                        {v.availability_status !== "available" ? "Rented" : "Reserved"}
                        {(blockEnd || v.rented_until)
                          ? ` till ${new Date(blockEnd || v.rented_until!).toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}`
                          : ""}
                      </div>
                    )}
                  </div>
                  <CardContent className="flex flex-1 flex-col gap-4 p-5 font-barlow">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase text-rental-primary">{v.vehicle_type || "Premium fleet"}</p>
                        <h3 className="mt-1 line-clamp-2 min-h-[3.5rem] text-xl font-semibold leading-7 text-rental-foreground">{v.year} {v.make} {v.model}</h3>
                      </div>
                      {v.availability_status === "available" && <Check className="mt-1 h-4 w-4 text-rental-success" />}
                    </div>
                    {(v.booked || []).length > 0 && (
                      <div className="text-xs text-rental-muted">
                        <span className="font-semibold uppercase text-rental-primary">Booked: </span>
                        {(v.booked || []).map((r) => `${new Date(r.start_date).toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}–${new Date(r.end_date || r.start_date).toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}`).join(", ")}
                      </div>
                    )}
                    <p className="flex items-center gap-1.5 text-xs text-rental-muted">
                      <MapPin className="h-3.5 w-3.5 text-rental-primary" /> {formatRentalLocation(v.pickup_location)}
                    </p>
                    {unavailable && (blockEnd || v.rented_until) && (
                      <p className="text-xs font-semibold text-rental-warning">
                        Available from {new Date(new Date(blockEnd || v.rented_until!).getTime() + 86_400_000).toLocaleDateString()}
                      </p>
                    )}
                    <div className="mt-auto border-t border-rental-line pt-4">
                      <div className="flex flex-col gap-2">
                        {purchaseAvailable && <Button asChild size="sm" variant="outline" className="w-full rounded-none border-rental-primary text-rental-primary hover:bg-rental-primary hover:text-rental-primary-foreground"><Link to="/rentals/purchase/$vehicleId" params={{ vehicleId: v.id }}><BadgeDollarSign className="mr-1 h-3.5 w-3.5" /> Purchase</Link></Button>}
                        <Button asChild size="sm" className="w-full rounded-none bg-rental-success font-semibold text-rental-background hover:bg-rental-success/90">
                          <Link to="/rentals/$id" params={{ id: v.id }} onClick={(e) => gate(e, `/rentals/${v.id}`)}>View car <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
                        </Button>
                        {unavailable && (
                          <Button asChild size="sm" className="w-full rounded-none bg-rental-warning font-semibold text-rental-warning-foreground hover:bg-rental-warning/90">
                            <Link to="/rentals/$id" params={{ id: v.id }} hash="notify" onClick={(e) => gate(e, `/rentals/${v.id}#notify`)}>Notify Me <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
                          </Button>
                        )}
                      </div>
                    </div>

                  </CardContent>
                </Card>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 font-barlow">
              <p className="w-full pb-2 text-center text-[11px] font-semibold uppercase text-rental-muted">
                Showing {(currentPage - 1) * PER_PAGE + 1}–{Math.min(currentPage * PER_PAGE, filtered.length)} of {filtered.length}
              </p>
              <Button
                size="sm"
                onClick={() => goPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="rounded-none border border-rental-line bg-rental-surface font-semibold text-rental-foreground hover:border-rental-primary hover:text-rental-primary disabled:opacity-40"
              >
                Prev
              </Button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <Button
                  key={n}
                  size="sm"
                  onClick={() => goPage(n)}
                  aria-current={n === currentPage ? "page" : undefined}
                  className={
                    n === currentPage
                      ? "rounded-none bg-rental-primary font-semibold text-rental-primary-foreground hover:bg-rental-primary/90"
                      : "rounded-none border border-rental-line bg-rental-surface text-rental-foreground hover:border-rental-primary hover:text-rental-primary"
                  }
                >
                  {n}
                </Button>
              ))}
              <Button
                size="sm"
                onClick={() => goPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="rounded-none border border-rental-line bg-rental-surface font-semibold text-rental-foreground hover:border-rental-primary hover:text-rental-primary disabled:opacity-40"
              >
                Next
              </Button>

            </div>
          )}
          </>
        )}


        <div className="font-barlow"><CapturesGallery limit={12} /></div>
      </div>

      <Dialog open={!!gateTarget} onOpenChange={(o) => !o && setGateTarget(null)}>
        <DialogContent className="rentals-showroom rounded-none border-rental-line bg-rental-surface font-barlow text-rental-foreground">
          <DialogHeader>
            <DialogTitle className="text-rental-foreground">Do you already have an account?</DialogTitle>
            <DialogDescription className="text-rental-muted">Sign in to view this car, book it, or get notified when it's available.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild className="flex-1 rounded-none bg-rental-success font-semibold text-rental-background hover:bg-rental-success/90">
              <a href={`/login?redirect=${encodeURIComponent(gateTarget || "/rentals")}`}>Yes, sign in</a>
            </Button>
            <Button asChild className="flex-1 rounded-none border border-rental-line bg-rental-elevated font-semibold text-rental-foreground hover:bg-rental-elevated/80">
              <a href={`/rentals/signup?redirect=${encodeURIComponent(gateTarget || "/rentals")}${refParam ? `&ref=${encodeURIComponent(refParam)}` : ""}`}>No, create one</a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Rentals;
