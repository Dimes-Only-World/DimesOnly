import { createFileRoute } from "@tanstack/react-router";
import Rentals from "@/pages/Rentals";

const rentalsShareImage = "https://www.dimesonly.world/rentals-share.png";
const rentalsDescription =
  "Car at rates that not only puts cash in your pocket, but works on prices against the competition.";

export const Route = createFileRoute("/rentals")({
  component: Rentals,
  head: () => ({
    meta: [
      { title: "Dimes Only Rentals" },
      { name: "description", content: rentalsDescription },
      { link: "canonical", rel: "canonical", href: "https://dimesonly.world/rentals" },
      { property: "og:title", content: "Dimes Only Rentals" },
      { property: "og:description", content: rentalsDescription },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://dimesonly.world/rentals" },
      { property: "og:image", content: rentalsShareImage },
      { property: "og:image:secure_url", content: rentalsShareImage },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Dimes Only Rentals" },
      { name: "twitter:description", content: rentalsDescription },
      { name: "twitter:image", content: rentalsShareImage },
    ],
  }),
});
