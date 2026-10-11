import { createFileRoute } from "@tanstack/react-router";
import ListACar from "@/pages/rentals/ListACar";

export const Route = createFileRoute("/rentals/list")({
  component: ListACar,
});
