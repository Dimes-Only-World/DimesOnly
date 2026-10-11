import { createFileRoute } from "@tanstack/react-router";
import Rentals from "@/pages/Rentals";

export const Route = createFileRoute("/rental")({
  component: Rentals,
});
