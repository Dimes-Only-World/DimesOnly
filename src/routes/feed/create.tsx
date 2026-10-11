import { createFileRoute } from "@tanstack/react-router";
import FeedCreate from "@/pages/FeedCreate";

export const Route = createFileRoute("/feed/create")({
  component: FeedCreate,
});
