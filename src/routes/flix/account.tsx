import { createFileRoute } from "@tanstack/react-router";
import FlixAccount from "@/pages/flix/FlixAccount";

export const Route = createFileRoute("/flix/account")({
  component: FlixAccount,
});
