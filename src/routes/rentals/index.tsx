import { createFileRoute } from "@tanstack/react-router";
import Rentals from "@/pages/Rentals";
import { rentalsHead } from "@/lib/rentals-head";

export const Route = createFileRoute("/rentals/")({
  component: Rentals,
  head: () => rentalsHead(
    "Dimes Only Rentals",
    "Car at rates that not only puts cash in your pocket, but works on prices against the competition.",
    "/rentals",
    "https://dimesonly.world/__l5e/assets-v1/1c03ad68-a9e9-4210-a4b3-4a332be6efbe/rentals-share-best.jpg",
  ),
});