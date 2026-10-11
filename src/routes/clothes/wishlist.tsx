import { createFileRoute } from "@tanstack/react-router";
import StoreWishlist from "@/pages/store/StoreWishlist";

export const Route = createFileRoute("/clothes/wishlist")({
  component: StoreWishlist,
});
