import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signRentalMedia } from "@/lib/rentalMedia";
import { DEFAULT_RENTAL_UPDATES, parseRentalUpdates, type RentalUpdate } from "@/lib/rentalUpdates";

type Slide = RentalUpdate & { src: string | null };

/** Rotating news/photos shown between the credit-app box and the search on /rentals. */
export default function RentalUpdatesCarousel() {
  const [slides, setSlides] = useState<Slide[]>(DEFAULT_RENTAL_UPDATES.map((s) => ({ ...s, src: s.image_url || null })));
  const [i, setI] = useState(0);

  useEffect(() => {
    let live = true;
    (async () => {
      const { data } = await supabase.from("app_settings" as any).select("value").eq("key", "rental_updates").maybeSingle();
      if (!data) return;
      const items = parseRentalUpdates((data as any).value);
      const map = await signRentalMedia("vehicle-media", items.map((x) => x.path || "").filter(Boolean));
      if (live) { setSlides(items.map((x) => ({ ...x, src: (x.path && map.get(x.path)) || x.image_url || null }))); setI(0); }
    })();
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length]);

  if (!slides.length) return null;
  const go = (d: number) => setI((n) => (n + d + slides.length) % slides.length);

  // Finger swipe left/right moves through the slides — phones show no arrow buttons.
  const touchStart = React.useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    touchStart.current = t ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    const t = e.changedTouches[0];
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
  };


  return (
    <section aria-label="Rental updates" className="relative mb-6 overflow-hidden border-y border-rental-line bg-rental-surface">
      <div className="relative aspect-[4/3] w-full touch-pan-y sm:aspect-[21/8] sm:max-h-[480px]" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {slides.map((s, n) => (
          <div key={s.id} className={`absolute inset-0 transition-opacity duration-700 ${n === i ? "opacity-100" : "pointer-events-none opacity-0"}`} aria-hidden={n !== i}>
            {s.src && <img src={s.src} alt={s.title || "Rental update"} className="h-full w-full object-cover" loading={n === 0 ? "eager" : "lazy"} />}
            {(s.title || s.body) && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-rental-background via-rental-background/70 to-transparent px-4 pb-5 pt-16 sm:px-8 sm:pb-6 lg:px-12">
                <div className="mx-auto max-w-7xl">
                  {s.title && <h2 className="font-display text-xl uppercase leading-tight text-rental-foreground sm:text-4xl">{s.title}</h2>}
                  {s.body && <p className="mt-1 font-barlow text-sm text-rental-foreground/85 sm:text-base">{s.body}</p>}
                </div>
              </div>
            )}
          </div>
        ))}
        {slides.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous update" className="absolute left-3 top-1/3 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-rental-background/70 text-rental-foreground sm:flex sm:left-6"><ChevronLeft className="h-5 w-5" /></button>
            <button type="button" onClick={() => go(1)} aria-label="Next update" className="absolute right-3 top-1/3 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-rental-background/70 text-rental-foreground sm:flex sm:right-6"><ChevronRight className="h-5 w-5" /></button>

            <div className="absolute right-4 top-3 flex gap-1.5 sm:right-8">
              {slides.map((s, n) => <button key={s.id} type="button" onClick={() => setI(n)} aria-label={`Show update ${n + 1}`} className={`h-2 w-2 rounded-full ${n === i ? "bg-rental-primary" : "bg-rental-foreground/50"}`} />)}
            </div>
          </>
        )}

      </div>
    </section>
  );
}
