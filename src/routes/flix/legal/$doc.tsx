import { createFileRoute } from "@tanstack/react-router";
import FlixLegal from "@/pages/flix/FlixLegal";

export const Route = createFileRoute("/flix/legal/$doc")({
  component: FlixLegal,
});
