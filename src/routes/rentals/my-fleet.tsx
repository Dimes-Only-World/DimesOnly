import { createFileRoute } from "@tanstack/react-router";
import MyFleet from "@/pages/rentals/MyFleet";
import { rentalsHead } from "@/lib/rentals-head";

export const Route = createFileRoute("/rentals/my-fleet")({
  component: MyFleet,
  head: () => rentalsHead("My Fleet — Dimes Only Rentals", "View your hosted vehicles and fleet information.", "/rentals/my-fleet"),
});
