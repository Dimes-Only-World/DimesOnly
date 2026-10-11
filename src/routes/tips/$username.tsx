import { createFileRoute, redirect } from "@tanstack/react-router";

// /tips/username opens that Dime's page, keeping any ?ref= credit.
export const Route = createFileRoute("/tips/$username")({
  beforeLoad: ({ params, location }) => {
    const ref = new URLSearchParams(location.searchStr).get("ref");
    throw redirect({ href: "/tip?" + new URLSearchParams({ tip: params.username, ...(ref ? { ref } : {}) }).toString(), replace: true });
  },
});
