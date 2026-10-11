import { createFileRoute } from "@tanstack/react-router";
import FlixBrowse from "@/pages/flix/FlixBrowse";

export const Route = createFileRoute("/flix/browse")({
  component: FlixBrowse,
});
