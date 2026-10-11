import { createFileRoute } from "@tanstack/react-router";
import NewIndex from "@/pages/NewIndex";
import AgeVerificationWrapper from "@/components/AgeVerificationWrapper";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dimes Only Network" },
      { name: "description", content: "A dynamic platform for fans to engage with their favorite performers, featuring tips, events, and exclusive content." },
      { property: "og:title", content: "Dimes Only Network" },
      { property: "og:description", content: "A dynamic platform for fans to engage with their favorite performers, featuring tips, events, and exclusive content." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://www.dimesonly.world/assets/dimelot.jpg" },
      { property: "og:image:secure_url", content: "https://www.dimesonly.world/assets/dimelot.jpg" },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:alt", content: "Dimes Only World" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://www.dimesonly.world/assets/dimelot.jpg" },
      { name: "twitter:image:alt", content: "Dimes Only World" },
    ],
  }),
  component: () => (
    <AgeVerificationWrapper>
      <NewIndex />
    </AgeVerificationWrapper>
  ),
});
