import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";
import AgeVerificationWrapper from "@/components/AgeVerificationWrapper";

export const Route = createFileRoute("/failsafe")({
  component: () => (
    <AgeVerificationWrapper>
      <Index />
    </AgeVerificationWrapper>
  ),
});
