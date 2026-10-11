import { createFileRoute } from "@tanstack/react-router";
import StoreHome from "@/pages/store/StoreHome";

export const Route = createFileRoute("/clothes")({
  component: StoreHome,
});
