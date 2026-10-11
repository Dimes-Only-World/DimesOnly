import { createFileRoute } from "@tanstack/react-router";
import { Navigate } from "@/lib/router-compat";

export const Route = createFileRoute("/dashboard")({
  component: () => <Navigate to="/dashboard/profile" replace />,
});
