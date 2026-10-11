import { createFileRoute } from "@tanstack/react-router";
import NewIndex from "@/pages/NewIndex";

export const Route = createFileRoute("/")({
  component: NewIndex,
});
