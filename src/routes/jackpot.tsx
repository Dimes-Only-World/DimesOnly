import { createFileRoute } from "@tanstack/react-router";
import Jackpot from "@/pages/Jackpot";

export const Route = createFileRoute("/jackpot")({
  component: Jackpot,
});
