import { createFileRoute, redirect } from "@tanstack/react-router";

// /tips?tip=name (or ?dime=name) opens that Dime's page; otherwise the list.
export const Route = createFileRoute("/tips/")({
  beforeLoad: ({ location }) => {
    const s = new URLSearchParams(location.searchStr);
    const dime = s.get("tip") || s.get("dime");
    const ref = s.get("ref");
    if (dime) throw redirect({ href: "/tip?" + new URLSearchParams({ tip: dime, ...(ref ? { ref } : {}) }).toString(), replace: true });
    throw redirect({ href: "/tip-girls" + (ref ? "?ref=" + encodeURIComponent(ref) : ""), replace: true });
  },
});
