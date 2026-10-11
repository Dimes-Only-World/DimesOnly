import { createFileRoute } from "@tanstack/react-router";
import StoreCheckout from "@/pages/store/StoreCheckout";

export const Route = createFileRoute("/clothes/checkout")({
  component: StoreCheckout,
});
