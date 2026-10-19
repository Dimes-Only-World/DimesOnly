import { createFileRoute } from "@tanstack/react-router";
import MyBookings from "@/pages/MyBookings";

export const Route = createFileRoute("/tmp-myrentals-check")({
  component: MyBookings,
  head: () => ({ meta: [{ title: "temp check" }] }),
});
