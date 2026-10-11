import { createFileRoute } from "@tanstack/react-router";
import FlixWatch from "@/pages/flix/FlixWatch";
import { flixHead } from "@/lib/flix-head";

export const Route = createFileRoute("/flix/watch/$id")({
  component: FlixWatch,
  head: ({ params }) => flixHead("Watch — FlameFlix", "Watch exclusive FlameFlix content.", `/flix/watch/${params.id}`),
});
