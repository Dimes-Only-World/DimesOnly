import { createFileRoute } from "@tanstack/react-router";
import UpgradeSilverPlus from "@/pages/UpgradeSilverPlus";

export const Route = createFileRoute("/upgrade-silver-plus")({
  component: UpgradeSilverPlus,
});
