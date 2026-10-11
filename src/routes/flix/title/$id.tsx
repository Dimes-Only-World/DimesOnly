import { createFileRoute } from "@tanstack/react-router";
import FlixTitlePage from "@/pages/flix/FlixTitle";
import { flixHead } from "@/lib/flix-head";

export const Route = createFileRoute("/flix/title/$id")({
  component: FlixTitlePage,
  head: ({ params }) => flixHead("Title — FlameFlix", "Explore this FlameFlix title and streaming availability.", `/flix/title/${params.id}`),
});
