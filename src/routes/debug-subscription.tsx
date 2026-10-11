import { createFileRoute } from "@tanstack/react-router";
import SubscriptionsDebug from "@/pages/SubscriptionsDebug";

export const Route = createFileRoute("/debug-subscription")({
  component: SubscriptionsDebug,
});
