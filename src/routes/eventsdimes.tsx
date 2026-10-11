import { createFileRoute } from "@tanstack/react-router";
import EventsDimes from "@/pages/EventsDimes";

export const Route = createFileRoute("/eventsdimes")({
  component: EventsDimes,
});
