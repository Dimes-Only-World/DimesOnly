import { createFileRoute } from "@tanstack/react-router";
import FlixEarn from "@/pages/flix/FlixEarn";

export const Route = createFileRoute("/flix/earn")({
  component: FlixEarn,
});
