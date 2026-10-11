import { createFileRoute } from "@tanstack/react-router";
import FlixEarn from "@/pages/flix/FlixEarn";
import { flixHead } from "@/lib/flix-head";

export const Route = createFileRoute("/flix/earn")({
  component: FlixEarn,
  head: () => flixHead("Earn — FlameFlix", "Explore FlameFlix referral earnings with Dimes Only.", "/flix/earn"),
});
