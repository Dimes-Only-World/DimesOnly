import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { signRentalMedia } from "@/lib/rentalMedia";
import fallback from "@/assets/purchase-bg-default.png.asset.json";

/** Fixed, slowly rotating vehicle photos behind the buyer application; photos are managed in Admin → Rentals → Purchases. */
export default function PurchaseBackdrop() {
  const [urls, setUrls] = useState<string[]>([fallback.url]);
  const [i, setI] = useState(0);
  useEffect(() => {
    let live = true;
    (async () => {
      const { data } = await supabase.from("app_settings" as any).select("value").eq("key", "purchase_backgrounds").maybeSingle();
      const paths: string[] = Array.isArray((data as any)?.value?.paths) ? (data as any).value.paths : [];
      if (!paths.length) return;
      const map = await signRentalMedia("vehicle-media", paths);
      const list = paths.map((p) => map.get(p)).filter(Boolean) as string[];
      if (live && list.length) { setUrls(list); setI(0); }
    })();
    return () => { live = false; };
  }, []);
  useEffect(() => { if (urls.length < 2) return; const t = setInterval(() => setI((n) => (n + 1) % urls.length), 6000); return () => clearInterval(t); }, [urls]);
  return <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
    {urls.map((u, n) => <img key={u} src={u} alt="" className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1500ms] ${n === i ? "opacity-100" : "opacity-0"}`} />)}
    <div className="absolute inset-0 bg-rental-background/80" />
  </div>;
}
