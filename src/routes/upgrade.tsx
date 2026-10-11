import { createFileRoute } from "@tanstack/react-router";
import Upgrade from "@/pages/Upgrade";

export const Route = createFileRoute("/upgrade")({
  component: Upgrade,
});
