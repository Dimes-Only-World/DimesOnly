import { createFileRoute } from "@tanstack/react-router";
import UpgradeDiamond from "@/pages/UpgradeDiamond";

export const Route = createFileRoute("/upgrade-diamond")({
  component: UpgradeDiamond,
});
