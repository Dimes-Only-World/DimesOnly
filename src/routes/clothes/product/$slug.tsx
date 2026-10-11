import { createFileRoute } from "@tanstack/react-router";
import StoreProductPage from "@/pages/store/StoreProduct";

export const Route = createFileRoute("/clothes/product/$slug")({
  component: StoreProductPage,
});
