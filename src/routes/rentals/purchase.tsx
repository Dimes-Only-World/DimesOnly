import { createFileRoute } from "@tanstack/react-router";
import VehiclePurchaseApplication from "@/pages/rentals/VehiclePurchaseApplication";

export const Route = createFileRoute("/rentals/purchase")({
  component: VehiclePurchaseApplication,
});
