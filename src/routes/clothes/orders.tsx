import { createFileRoute } from "@tanstack/react-router";
import StoreOrders from "@/pages/store/StoreOrders";

export const Route = createFileRoute("/clothes/orders")({
  component: StoreOrders,
});
