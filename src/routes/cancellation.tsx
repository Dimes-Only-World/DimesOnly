import { createFileRoute } from "@tanstack/react-router";
import LegalPage from "@/components/rentals/LegalPage";
import { CANCELLATION_SECTIONS } from "@/lib/cancellationContent";

export const Route = createFileRoute("/cancellation")({
  head: () => ({
    meta: [
      { title: "Cancellation Policy — Best Rental Cars" },
      { name: "description", content: "Free cancellation window, cancellation fees, no-show fees and late returns." },
      { property: "og:title", content: "Cancellation Policy — Best Rental Cars" },
      { property: "og:description", content: "Free cancellation window, cancellation fees, no-show fees and late returns." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <LegalPage title="CANCELLATION POLICY" subtitle="How cancellations, no-shows and late returns are handled." sections={CANCELLATION_SECTIONS} />,
});
