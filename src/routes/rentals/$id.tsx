import { createFileRoute } from "@tanstack/react-router";
import RentalDetails from "@/pages/RentalDetails";
import { rentalsHead } from "@/lib/rentals-head";

export const Route = createFileRoute("/rentals/$id")({
  component: RentalDetails,
  head: ({ params }) => rentalsHead("Vehicle Details — Dimes Only Rentals", "View vehicle photos, rental rates, pickup details and booking options.", `/rentals/${params.id}`),
});
