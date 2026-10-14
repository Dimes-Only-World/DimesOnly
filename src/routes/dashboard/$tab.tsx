import { createFileRoute } from "@tanstack/react-router";
import Dashboard from "@/pages/Dashboard";

export const Route = createFileRoute("/dashboard/$tab")({
  head: ({ params }) => {
    const section = params.tab.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    const title = `${section} | Dimes Only World`;
    const description = `Manage your ${section.toLowerCase()} on Dimes Only World.`;
    return { meta: [
      { title }, { name: 'description', content: description },
      { property: 'og:title', content: title }, { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
    ] };
  },
  component: Dashboard,
});
