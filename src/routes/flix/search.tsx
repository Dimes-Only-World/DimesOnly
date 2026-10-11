import { createFileRoute } from "@tanstack/react-router";
import FlixSearch from "@/pages/flix/FlixSearch";
import { flixHead } from "@/lib/flix-head";

export const Route = createFileRoute("/flix/search")({
  component: FlixSearch,
  head: () => flixHead("Search — FlameFlix", "Search the FlameFlix collection for your next watch.", "/flix/search"),
});
