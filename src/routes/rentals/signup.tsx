import { createFileRoute } from "@tanstack/react-router";
import RentalSignup from "@/pages/rentals/RentalSignup";
import { rentalsHead } from "@/lib/rentals-head";

export const Route = createFileRoute("/rentals/signup")({
  component: RentalSignup,
  head: () => rentalsHead(
    "Create a Rentals Account | Dimes Only Rentals",
    "Sign up in minutes to book cars, get notified when a car is available, and track your rentals and purchases.",
    "/rentals/signup",
  ),
});
