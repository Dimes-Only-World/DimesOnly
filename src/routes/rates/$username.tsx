import { createFileRoute, redirect } from "@tanstack/react-router";

// /rates/username opens that Dime's page, keeping any ?ref= credit.
export const Route = createFileRoute("/rates/$username")({
  beforeLoad: ({ params, location }) => {
    const ref = new URLSearchParams(location.searchStr).get("ref");
    throw redirect({ href: "/rate?" + new URLSearchParams({ rate: params.username, ...(ref ? { ref } : {}) }).toString(), replace: true });
  },
});
