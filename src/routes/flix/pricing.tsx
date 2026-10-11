import { createFileRoute } from "@tanstack/react-router";
import FlixPricing from "@/pages/flix/FlixPricing";

export const Route = createFileRoute("/flix/pricing")({
  component: FlixPricing,
});
