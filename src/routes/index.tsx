import { createFileRoute } from "@tanstack/react-router";
import NewIndex from "@/pages/NewIndex";
import AgeVerificationWrapper from "@/components/AgeVerificationWrapper";

export const Route = createFileRoute("/")({
  component: () => (
    <AgeVerificationWrapper>
      <NewIndex />
    </AgeVerificationWrapper>
  ),
});
