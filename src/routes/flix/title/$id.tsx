import { createFileRoute } from "@tanstack/react-router";
import FlixTitlePage from "@/pages/flix/FlixTitle";

export const Route = createFileRoute("/flix/title/$id")({
  component: FlixTitlePage,
});
