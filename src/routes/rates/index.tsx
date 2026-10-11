import { createFileRoute, redirect } from "@tanstack/react-router";

// /rates?rate=name (or ?dime=name) opens that Dime's page; otherwise the list.
export const Route = createFileRoute("/rates/")({
  beforeLoad: ({ location }) => {
    const s = new URLSearchParams(location.searchStr);
    const dime = s.get("rate") || s.get("dime");
    const ref = s.get("ref");
    if (dime) throw redirect({ href: "/rate?" + new URLSearchParams({ rate: dime, ...(ref ? { ref } : {}) }).toString(), replace: true });
    throw redirect({ href: "/rate-girls" + (ref ? "?ref=" + encodeURIComponent(ref) : ""), replace: true });
  },
});
