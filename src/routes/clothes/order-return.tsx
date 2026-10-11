import { createFileRoute } from "@tanstack/react-router";
import StoreOrderReturn from "@/pages/store/StoreOrderReturn";

export const Route = createFileRoute("/clothes/order-return")({
  component: StoreOrderReturn,
});
