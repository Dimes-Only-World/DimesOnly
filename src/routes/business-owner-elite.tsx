import { createFileRoute } from "@tanstack/react-router";
import BusinessOwnerElite from "@/pages/BusinessOwnerElite";

export const Route = createFileRoute("/business-owner-elite")({
  component: BusinessOwnerElite,
});
