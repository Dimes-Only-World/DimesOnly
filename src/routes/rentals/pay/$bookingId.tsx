import { createFileRoute } from "@tanstack/react-router";
import RentalPayment from "@/pages/RentalPayment";

export const Route = createFileRoute("/rentals/pay/$bookingId")({
  component: RentalPayment,
});
