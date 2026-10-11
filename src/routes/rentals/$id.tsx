import { createFileRoute } from "@tanstack/react-router";
import RentalDetails from "@/pages/RentalDetails";

export const Route = createFileRoute("/rentals/$id")({
  component: RentalDetails,
});
