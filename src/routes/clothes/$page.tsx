import { createFileRoute } from "@tanstack/react-router";
import StorePolicies from "@/pages/store/StorePolicies";

export const Route = createFileRoute("/clothes/$page")({
  component: StorePolicies,
});
