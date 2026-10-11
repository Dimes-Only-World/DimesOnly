export function rentalsHead(title: string, description: string, path: string, image?: string) {
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `https://dimesonly.world${path}` },
      { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
      ...(image ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }] : []),
    ],
    links: [{ rel: "canonical", href: `https://dimesonly.world${path}` }],
  };
}