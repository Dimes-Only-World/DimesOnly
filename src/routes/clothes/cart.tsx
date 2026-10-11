import { createFileRoute } from "@tanstack/react-router";
import StoreCart from "@/pages/store/StoreCart";

export const Route = createFileRoute("/clothes/cart")({
  component: StoreCart,
});
