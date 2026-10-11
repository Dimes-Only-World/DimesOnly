import { createFileRoute } from "@tanstack/react-router";
import Rentals from "@/pages/Rentals";
import { rentalsHead } from "@/lib/rentals-head";

export const Route = createFileRoute("/rentals/")({
  component: Rentals,
  head: () => rentalsHead(
    "Dimes Only Rentals",
    "Car at rates that not only puts cash in your pocket, but works on prices against the competition.",
    "/rentals",
    "https://dimesonly.world/__l5e/assets-v1/c28b1e66-5637-4c19-a18a-add1288cb9d1/rentals-share.png",
  ),
});