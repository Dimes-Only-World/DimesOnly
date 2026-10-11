import { createFileRoute } from "@tanstack/react-router";
import Memberships from "@/pages/Memberships";

export const Route = createFileRoute("/memberships")({
  component: Memberships,
});
