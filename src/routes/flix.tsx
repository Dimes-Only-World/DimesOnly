import { createFileRoute } from "@tanstack/react-router";
import FlixLanding from "@/pages/flix/FlixLanding";

export const Route = createFileRoute("/flix")({
  component: FlixLanding,
});
