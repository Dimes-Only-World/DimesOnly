import { createFileRoute } from "@tanstack/react-router";
import LegalPage from "@/components/rentals/LegalPage";
import { PRIVACY_EFFECTIVE_DATE, PRIVACY_SECTIONS } from "@/lib/privacyPolicyContent";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Best Rental Cars" },
      { name: "description", content: "How Best Rental Cars collects, uses, shares and protects your information, including California rights." },
      { property: "og:title", content: "Privacy Policy — Best Rental Cars" },
      { property: "og:description", content: "How Best Rental Cars collects, uses, shares and protects your information." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <LegalPage
      title="PRIVACY POLICY"
      subtitle={PRIVACY_EFFECTIVE_DATE}
      sections={PRIVACY_SECTIONS}
    />
  ),
});
