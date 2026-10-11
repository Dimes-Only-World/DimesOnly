import { createFileRoute } from "@tanstack/react-router";
import ListACar from "@/pages/rentals/ListACar";
import { rentalsHead } from "@/lib/rentals-head";

export const Route = createFileRoute("/rentals/list")({
  component: ListACar,
  head: () => rentalsHead("List a Car — Dimes Only Rentals", "List your vehicle with Best Rental Cars.", "/rentals/list"),
});
