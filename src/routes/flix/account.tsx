import { createFileRoute } from "@tanstack/react-router";
import FlixAccount from "@/pages/flix/FlixAccount";
import { flixHead } from "@/lib/flix-head";

export const Route = createFileRoute("/flix/account")({
  component: FlixAccount,
  head: () => flixHead("Account — FlameFlix", "Manage your FlameFlix account and subscription.", "/flix/account"),
});
