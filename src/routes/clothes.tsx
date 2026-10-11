import { createFileRoute } from "@tanstack/react-router";
import StoreHome from "@/pages/store/StoreHome";
import clothesShareAsset from "@/assets/store/clothes-share.jpg.asset.json";

const clothesTitle = "Premium Clothing";
const clothesDescription =
  "Join the world of Dimes and get 10% to 20% of our clothing line on an active membership!";
const clothesShareImage = new URL(clothesShareAsset.url, "https://dimesonly.world").href;

export const Route = createFileRoute("/clothes")({
  component: StoreHome,
  head: () => ({
    meta: [
      { title: clothesTitle },
      { name: "description", content: clothesDescription },
      { property: "og:title", content: clothesTitle },
      { property: "og:description", content: clothesDescription },
      { property: "og:type", content: "website" },
      { property: "og:image", content: clothesShareImage },
      { property: "og:image:secure_url", content: clothesShareImage },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Dimes Only clothing" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: clothesTitle },
      { name: "twitter:description", content: clothesDescription },
      { name: "twitter:image", content: clothesShareImage },
      { name: "twitter:image:alt", content: "Dimes Only clothing" },
    ],
  }),
});
