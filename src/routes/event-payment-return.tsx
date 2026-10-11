import { createFileRoute } from "@tanstack/react-router";
import EventPayPalReturn from "@/pages/EventPayPalReturn";

export const Route = createFileRoute("/event-payment-return")({
  component: EventPayPalReturn,
});
