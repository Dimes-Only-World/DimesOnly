import { createFileRoute } from "@tanstack/react-router";
import HostApplication from "@/pages/rentals/HostApplication";
import { rentalsHead } from "@/lib/rentals-head";

export const Route = createFileRoute("/rentals/host/apply")({
  component: HostApplication,
  head: () => rentalsHead("Host Application — Dimes Only Rentals", "Submit your vehicle hosting application to Best Rental Cars.", "/rentals/host/apply"),
});
