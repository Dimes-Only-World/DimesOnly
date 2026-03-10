import { useEffect, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@supabase/supabase-js";
import dimePlaceholder from "@/assets/dime-placeholder.jpg";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://qkcuykpndrolrewwnkwb.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrY3V5a3BuZHJvbHJld3dua3diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzODIwNzAsImV4cCI6MjA2NDk1ODA3MH0.gamp40tIrDSMaI5_YMIrn3qCR-oVdx__YtvBl75yOJs";
const supabase = createClient(supabaseUrl, supabaseKey);

interface DimeProfile {
  id: string;
  username: string;
  image: string;
}

const LatestDimesCarousel = () => {
  const [dimes, setDimes] = useState<DimeProfile[]>([]);
  const [selected, setSelected] = useState<DimeProfile | null>(null);

  useEffect(() => {
    const fetchDimes = async () => {
      const { data, error } = await supabase
        .from("public_user_profiles")
        .select("id, username, profile_photo, front_page_photo")
        .in("user_type", ["stripper", "exotic"])
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && data) {
        const mapped = data
          .filter((u: any) => u.username)
          .map((u: any) => ({
            id: String(u.id),
            username: u.username,
            image: u.front_page_photo || u.profile_photo || dimePlaceholder,
          }));
        if (mapped.length > 0) setDimes(mapped);
      }
    };
    fetchDimes();
  }, []);

  const registerUrl = (username: string) =>
    `/register?ref=${encodeURIComponent(username)}`;

  const loginUrl = (username: string) =>
    `/login?ref=${encodeURIComponent(username)}&redirect=${encodeURIComponent(`/profile/${username}`)}`;

  if (dimes.length === 0) return null;

  return (
    <section className="py-20 bg-card/50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-12">
          Latest Dimes to Join
        </h2>

        <div className="px-12">
          <Carousel opts={{ align: "start", loop: true }} className="w-full">
            <CarouselContent>
              {dimes.map((dime) => (
                <CarouselItem key={dime.id} className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
                  <button
                    onClick={() => setSelected(dime)}
                    className="w-full rounded-xl overflow-hidden border border-border bg-card hover:border-primary transition-colors group"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden">
                      <img
                        src={dime.image}
                        alt={`@${dime.username}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground border-0 text-[10px]">
                        New Dime
                      </Badge>
                    </div>
                    <div className="p-3">
                      <p className="text-foreground text-sm font-semibold group-hover:text-primary transition-colors">
                        @{dime.username}
                      </p>
                    </div>
                  </button>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">@{selected?.username}</DialogTitle>
          </DialogHeader>
          <div className="aspect-video rounded-lg overflow-hidden mb-4">
            <img
              src={selected?.image || dimePlaceholder}
              alt={`@${selected?.username}`}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex gap-3">
            <a
              href={selected ? loginUrl(selected.username) : "/login"}
              className="flex-1 text-center py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              Login
            </a>
            <a
              href={selected ? registerUrl(selected.username) : "/register"}
              className="flex-1 text-center py-2 rounded-lg border border-primary text-primary font-semibold text-sm hover:bg-primary/10 transition-colors"
            >
              Sign Up
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default LatestDimesCarousel;
