import { createFileRoute } from "@tanstack/react-router";
import LegalPage from "@/components/rentals/LegalPage";
import { TERMS_EFFECTIVE_DATE, TERMS_SECTIONS } from "@/lib/termsContent";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Best Rental Cars" },
      { name: "description", content: "Terms of Service for Best Rental Cars and Dimes Only World." },
      { property: "og:title", content: "Terms of Service — Best Rental Cars" },
      { property: "og:description", content: "Terms of Service for Best Rental Cars and Dimes Only World." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <LegalPage title="TERMS OF SERVICE" subtitle={`Effective ${TERMS_EFFECTIVE_DATE}`} sections={TERMS_SECTIONS} />,
});
