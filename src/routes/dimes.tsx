import { createFileRoute } from "@tanstack/react-router";
import DimesPage from "@/pages/Dimes";

export const Route = createFileRoute("/dimes")({
  component: DimesPage,
});
