import { createFileRoute } from "@tanstack/react-router";
import UpgradeSilverSubscribe from "@/pages/UpgradeSilverSubscribe";

export const Route = createFileRoute("/upgrade-silver-subscribe")({
  component: UpgradeSilverSubscribe,
});
