import { createFileRoute } from "@tanstack/react-router";
import Rentals from "@/pages/Rentals";
import { rentalsHead } from "@/lib/rentals-head";

export const Route = createFileRoute("/rental")({
  component: Rentals,
  head: () => rentalsHead("Car Rentals — Dimes Only", "Browse the Best Rental Cars vehicle collection.", "/rental"),
});
