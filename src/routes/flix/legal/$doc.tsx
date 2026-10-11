import { createFileRoute } from "@tanstack/react-router";
import FlixLegal from "@/pages/flix/FlixLegal";
import { flixHead } from "@/lib/flix-head";

export const Route = createFileRoute("/flix/legal/$doc")({
  component: FlixLegal,
  head: ({ params }) => flixHead(`${params.doc.replaceAll("-", " ")} — FlameFlix`, "Read FlameFlix policies and subscription terms.", `/flix/legal/${params.doc}`),
});
