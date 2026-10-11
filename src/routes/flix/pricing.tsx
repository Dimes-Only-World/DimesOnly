import { createFileRoute } from "@tanstack/react-router";
import FlixPricing from "@/pages/flix/FlixPricing";
import { flixHead } from "@/lib/flix-head";

export const Route = createFileRoute("/flix/pricing")({
  component: FlixPricing,
  head: () => flixHead("Pricing — FlameFlix", "Explore FlameFlix streaming subscriptions and membership options.", "/flix/pricing"),
});
