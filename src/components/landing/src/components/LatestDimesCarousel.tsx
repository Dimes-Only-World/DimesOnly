import { useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import dimePlaceholder from "@/assets/dime-placeholder.jpg";

const mockDimes = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  username: `dime_${i + 1}`,
}));

const LatestDimesCarousel = () => {
  const [selected, setSelected] = useState<(typeof mockDimes)[0] | null>(null);
  const [searchParams] = useSearchParams();
  const ref = searchParams.get("ref");
  const loginUrl = ref ? `/login?ref=${encodeURIComponent(ref)}` : "/login";
  const registerUrl = ref ? `/register?ref=${encodeURIComponent(ref)}` : "/register";

  return (
    <section className="py-20 bg-card/50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-12">
          Latest Dimes to Join
        </h2>

        <div className="px-12">
          <Carousel opts={{ align: "start", loop: true }} className="w-full">
            <CarouselContent>
              {mockDimes.map((dime) => (
                <CarouselItem key={dime.id} className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
                  <button
                    onClick={() => setSelected(dime)}
                    className="w-full rounded-xl overflow-hidden border border-border bg-card hover:border-primary transition-colors group"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden">
                      <img
                        src={dimePlaceholder}
                        alt={`@${dime.username}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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

      {/* Lightbox modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">@{selected?.username}</DialogTitle>
          </DialogHeader>
          <div className="aspect-video rounded-lg overflow-hidden mb-4">
            <img
              src={dimePlaceholder}
              alt={`@${selected?.username}`}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex gap-3">
            <Link
              to="/login"
              className="flex-1 text-center py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="flex-1 text-center py-2 rounded-lg border border-primary text-primary font-semibold text-sm hover:bg-primary/10 transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default LatestDimesCarousel;
