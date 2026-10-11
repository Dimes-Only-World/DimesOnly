import { createFileRoute } from "@tanstack/react-router";
import FlixBrowse from "@/pages/flix/FlixBrowse";
import { flixHead } from "@/lib/flix-head";

export const Route = createFileRoute("/flix/browse")({
  component: FlixBrowse,
  head: () => flixHead("Browse — FlameFlix", "Browse FlameFlix originals, trending titles, and new releases.", "/flix/browse"),
});
