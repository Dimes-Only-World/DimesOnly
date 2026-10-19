import { createFileRoute } from "@tanstack/react-router";
import MyPurchases from "@/pages/rentals/MyPurchases";
import { rentalsHead } from "@/lib/rentals-head";

export const Route = createFileRoute("/account/my-purchases")({
  component: MyPurchases,
  head: () => rentalsHead("My Purchases — Dimes Only Rentals", "Track your vehicle purchase application status and upload documents.", "/account/my-purchases"),
});
