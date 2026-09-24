import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { buildAuthUrl } from "@/lib/refCapture";

type Car = {
  id: string; make: string; model: string; year: string; color: string | null; license_plate: string | null;
  status: string; earnings_total: number | null; earnings_plan: string; vehicle_photo_path: string | null; signed_at: string;
};

const tag = (s: string) => {
  if (s === "approved" || s === "active") return { t: "Approved", c: "bg-rental-primary text-rental-background" };
  if (s === "disapproved" || s === "rejected") return { t: "Disapproved", c: "bg-destructive text-destructive-foreground" };
  if (s === "removed") return { t: "Removed", c: "bg-rental-line text-rental-foreground" };
  return { t: "Pending review", c: "bg-rental-line text-rental-foreground" };
};

const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const MyFleet: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(true);
  const [cars, setCars] = useState<Car[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setSignedIn(false); setLoading(false); return; }
      const { data } = await supabase
        .from("host_applications")
        .select("id, make, model, year, color, license_plate, status, earnings_total, earnings_plan, vehicle_photo_path, signed_at")
        .order("created_at", { ascending: false });
      const rows = (data || []) as Car[];
      setCars(rows);
      const urls: Record<string, string> = {};
      await Promise.all(rows.filter((r) => r.vehicle_photo_path).map(async (r) => {
        const { data: s } = await supabase.storage.from("host-documents").createSignedUrl(r.vehicle_photo_path!, 3600);
        if (s?.signedUrl) urls[r.id] = s.signedUrl;
      }));
      setPhotos(urls);
      setLoading(false);
    })();
  }, []);

  const total = cars.reduce((s, c) => s + Number(c.earnings_total || 0), 0);

  return (
    <div className="rentals-showroom min-h-screen bg-rental-background text-rental-foreground">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <Link to="/rentals" className="text-sm text-rental-muted hover:text-rental-primary">← Back to Rentals</Link>
        <h1 className="mt-4 text-3xl font-bold uppercase tracking-wide">My Fleet</h1>

        {loading ? <p className="mt-6 text-rental-muted">Loading…</p> : !signedIn ? (
          <div className="mt-6 space-y-3">
            <p>Log in to see your vehicles and money made.</p>
            <Link to={buildAuthUrl("/login", "/rentals/my-fleet")} className="inline-block bg-rental-primary px-6 py-3 font-semibold text-rental-background">Log in</Link>
          </div>
        ) : (
          <>
            <div className="mt-6 border border-rental-line p-5">
              <p className="text-xs uppercase tracking-wide text-rental-muted">Total money made</p>
              <p className="text-3xl font-bold text-rental-primary">{money(total)}</p>
            </div>
            {!cars.length ? (
              <div className="mt-6 space-y-3">
                <p className="text-rental-muted">You haven't listed a vehicle yet.</p>
                <Link to="/rentals/host/apply" className="inline-block bg-rental-primary px-6 py-3 font-semibold text-rental-background">Become a Host</Link>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {cars.map((c) => {
                  const g = tag(c.status);
                  return (
                    <div key={c.id} className="flex flex-col gap-4 border border-rental-line p-4 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-3">
                        {photos[c.id]
                          ? <img src={photos[c.id]} alt={`${c.make} ${c.model}`} className="h-24 w-36 object-cover" />
                          : <div className="flex h-24 w-36 items-center justify-center bg-rental-line text-xs text-rental-muted">No photo</div>}
                        <span className={`rounded px-2 py-1 text-xs font-bold uppercase ${g.c}`}>{g.t}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-lg font-semibold">{c.year} {c.make} {c.model}</p>
                        <p className="text-sm text-rental-muted">{c.color || "—"} · Plate {c.license_plate || "—"} · Earn {c.earnings_plan}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase text-rental-muted">Money made</p>
                        <p className="text-xl font-bold text-rental-primary">{money(Number(c.earnings_total || 0))}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MyFleet;
