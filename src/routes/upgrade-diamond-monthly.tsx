import { createFileRoute } from "@tanstack/react-router";
import UpgradeDiamondMonthly from "@/pages/UpgradeDiamondMonthly";

export const Route = createFileRoute("/upgrade-diamond-monthly")({
  component: UpgradeDiamondMonthly,
});
