import { createFileRoute } from "@tanstack/react-router";
import RentalPayment from "@/pages/RentalPayment";
import { rentalsHead } from "@/lib/rentals-head";

export const Route = createFileRoute("/rentals/pay/$bookingId")({
  component: RentalPayment,
  head: ({ params }) => rentalsHead("Rental Payment — Dimes Only Rentals", "Complete payment for your vehicle rental booking.", `/rentals/pay/${params.bookingId}`),
});
