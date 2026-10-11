import { createFileRoute } from "@tanstack/react-router";
import MyBookings from "@/pages/MyBookings";
import { rentalsHead } from "@/lib/rentals-head";

export const Route = createFileRoute("/account/my-rentals")({
  component: MyBookings,
  head: () => rentalsHead("My Rentals — Dimes Only Rentals", "View your rental bookings, payments and extensions.", "/account/my-rentals"),
});
