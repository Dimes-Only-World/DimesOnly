import { createFileRoute } from "@tanstack/react-router";
import FlixSearch from "@/pages/flix/FlixSearch";

export const Route = createFileRoute("/flix/search")({
  component: FlixSearch,
});
