import { createFileRoute } from "@tanstack/react-router";
import FlixWatch from "@/pages/flix/FlixWatch";

export const Route = createFileRoute("/flix/watch/$id")({
  component: FlixWatch,
});
