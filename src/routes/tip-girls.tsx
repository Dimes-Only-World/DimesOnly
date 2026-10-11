import { createFileRoute } from "@tanstack/react-router";
import TipGirls from "@/pages/TipGirls";

export const Route = createFileRoute("/tip-girls")({
  component: TipGirls,
});
