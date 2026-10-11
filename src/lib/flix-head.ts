import shareLogo from "@/assets/flix/flix-share.jpg.asset.json";

export const flixDescription = "We will bring the hottest content. Join now for a lifetime opportunity.";

export function flixHead(title: string, description: string, path: string, shareImage = false) {
  const image = `https://dimesonly.world${shareLogo.url}`;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `https://dimesonly.world${path}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      ...(shareImage ? [
        { property: "og:image", content: image },
        { property: "og:image:alt", content: "FlameFlix logo" },
        { name: "twitter:image", content: image },
        { name: "twitter:image:alt", content: "FlameFlix logo" },
      ] : []),
    ],
    links: [{ rel: "icon", type: "image/png", href: "/flix-favicon.png" }],
  };
}