import { createFileRoute } from "@tanstack/react-router";
import Rate from "@/pages/Rate";

export const Route = createFileRoute("/rate")({
  component: Rate,
});
