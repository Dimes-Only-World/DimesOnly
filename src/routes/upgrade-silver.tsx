import { createFileRoute } from "@tanstack/react-router";
import UpgradeSilver from "@/pages/UpgradeSilver";

export const Route = createFileRoute("/upgrade-silver")({
  component: UpgradeSilver,
});
