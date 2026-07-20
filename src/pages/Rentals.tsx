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
}

const Rentals: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
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
      setVehicles(withMedia);
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 pt-20 pb-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-3">
            Luxury & Exotic Car Rentals
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Rent the ride you deserve. Daily, weekly, monthly, long-term, or rent-to-own.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8">
          <Input
            placeholder="Search year, make, model, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="md:col-span-2"
          />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
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
            <SelectTrigger>
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
              const startingRate =
                v.day_rate || v.weekly_rate || v.monthly_rate || v.down_payment || 0;
              const rateLabel = v.day_rate
                ? "/day"
                : v.weekly_rate
                ? "/week"
                : v.monthly_rate
                ? "/month"
                : "";
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
      </div>
    </div>
  );
};

export default Rentals;
