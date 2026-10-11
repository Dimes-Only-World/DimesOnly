import { createFileRoute } from "@tanstack/react-router";
import RateGirls from "@/pages/RateGirls";
import AuthGuard from "@/components/AuthGuard";

export const Route = createFileRoute("/rate-girls")({
  component: () => (
    <AuthGuard>
      <RateGirls />
    </AuthGuard>
  ),
});
