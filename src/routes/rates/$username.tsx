import { createFileRoute } from "@tanstack/react-router";
import RateRedirect from "@/pages/RateRedirect";

export const Route = createFileRoute("/rates/$username")({
  component: RateRedirect,
});
