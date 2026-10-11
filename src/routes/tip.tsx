import { createFileRoute } from "@tanstack/react-router";
import Tip from "@/pages/Tip";
import AuthGuard from "@/components/AuthGuard";

export const Route = createFileRoute("/tip")({
  component: () => (
    <AuthGuard>
      <Tip />
    </AuthGuard>
  ),
});
