import { createFileRoute } from "@tanstack/react-router";
import FlixLanding from "@/pages/flix/FlixLanding";
import { flixDescription, flixHead } from "@/lib/flix-head";

export const Route = createFileRoute("/flix/")({
  component: FlixLanding,
  head: () => flixHead("FlameFlix", flixDescription, "/flix", true),
});