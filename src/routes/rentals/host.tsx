import { createFileRoute } from "@tanstack/react-router";
import BecomeAHost from "@/pages/rentals/BecomeAHost";

export const Route = createFileRoute("/rentals/host")({
  component: BecomeAHost,
});
