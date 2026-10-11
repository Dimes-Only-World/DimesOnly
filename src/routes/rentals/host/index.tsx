import { createFileRoute } from "@tanstack/react-router";
import BecomeAHost from "@/pages/rentals/BecomeAHost";
import { rentalsHead } from "@/lib/rentals-head";

export const Route = createFileRoute("/rentals/host/")({
  component: BecomeAHost,
  head: () => rentalsHead("Become a Host — Dimes Only Rentals", "Explore vehicle hosting with Best Rental Cars.", "/rentals/host"),
});