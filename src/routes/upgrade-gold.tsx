import { createFileRoute } from "@tanstack/react-router";
import UpgradeGold from "@/pages/UpgradeGold";

export const Route = createFileRoute("/upgrade-gold")({
  component: UpgradeGold,
});
