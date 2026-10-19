import { createFileRoute } from "@tanstack/react-router";
import BestLogoBanner from "@/components/rentals/BestLogoBanner";

// Temporary: proves the banner stays edge-to-edge inside a page that has its own
// horizontal padding (the My Rentals wrapper), then gets deleted.
function TmpLogoCheck() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 pt-4 pb-16 px-4">
      <BestLogoBanner className="mb-6" />
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold">My Rentals</h1>
        <p className="text-muted-foreground text-sm">Manage your upcoming, active, and completed rentals.</p>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/tmp-logo-check")({
  component: TmpLogoCheck,
  head: () => ({ meta: [{ title: "temp check" }] }),
});
