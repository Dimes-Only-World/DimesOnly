import { createFileRoute } from "@tanstack/react-router";
import TipsRedirect from "@/pages/TipsRedirect";

export const Route = createFileRoute("/tips/$username")({
  component: TipsRedirect,
});
