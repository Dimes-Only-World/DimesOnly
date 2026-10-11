import { createFileRoute } from "@tanstack/react-router";
import MyBookings from "@/pages/MyBookings";

export const Route = createFileRoute("/account/my-rentals")({
  component: MyBookings,
});
