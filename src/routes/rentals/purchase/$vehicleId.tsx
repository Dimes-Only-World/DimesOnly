import { createFileRoute } from "@tanstack/react-router";
import VehiclePurchaseApplication from "@/pages/rentals/VehiclePurchaseApplication";
import { rentalsHead } from "@/lib/rentals-head";

export const Route = createFileRoute("/rentals/purchase/$vehicleId")({
  component: VehiclePurchaseApplication,
  head: ({ params }) => rentalsHead("Vehicle Purchase Application — Dimes Only Rentals", "Apply to purchase this vehicle through Best Rental Cars.", `/rentals/purchase/${params.vehicleId}`),
});
