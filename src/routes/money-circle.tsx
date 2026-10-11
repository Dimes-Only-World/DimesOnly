import { createFileRoute } from "@tanstack/react-router";
import MoneyCircle from "@/pages/MoneyCircle";

export const Route = createFileRoute("/money-circle")({
  component: MoneyCircle,
});
