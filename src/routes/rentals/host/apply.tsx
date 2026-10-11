import { createFileRoute } from "@tanstack/react-router";
import HostApplication from "@/pages/rentals/HostApplication";

export const Route = createFileRoute("/rentals/host/apply")({
  component: HostApplication,
});
