import { createFileRoute } from "@tanstack/react-router";
import TestLogin from "@/pages/TestLogin";

export const Route = createFileRoute("/test-login")({
  component: TestLogin,
});
