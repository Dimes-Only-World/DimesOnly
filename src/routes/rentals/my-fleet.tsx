import { createFileRoute } from "@tanstack/react-router";
import MyFleet from "@/pages/rentals/MyFleet";

export const Route = createFileRoute("/rentals/my-fleet")({
  component: MyFleet,
});
