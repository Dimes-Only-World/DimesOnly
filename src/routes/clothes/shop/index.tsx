import { createFileRoute } from "@tanstack/react-router";
import StoreShop from "@/pages/store/StoreShop";

export const Route = createFileRoute("/clothes/shop/")({
  component: StoreShop,
});
