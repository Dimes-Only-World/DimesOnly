import { createFileRoute } from "@tanstack/react-router";
import VehiclePurchaseApplication from "@/pages/rentals/VehiclePurchaseApplication";
import { rentalsHead } from "@/lib/rentals-head";

export const Route = createFileRoute("/rentals/purchase/")({
  component: VehiclePurchaseApplication,
  head: () => rentalsHead("Vehicle Credit Application — Dimes Only Rentals", "Apply for a vehicle purchase through Best Rental Cars.", "/rentals/purchase"),
});