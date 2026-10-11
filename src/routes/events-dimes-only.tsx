import { createFileRoute } from "@tanstack/react-router";
import EventsDimesOnly from "@/pages/EventsDimesOnly";

export const Route = createFileRoute("/events-dimes-only")({
  component: EventsDimesOnly,
});
