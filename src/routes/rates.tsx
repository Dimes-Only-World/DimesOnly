import { createFileRoute, Outlet } from "@tanstack/react-router";

// Parent only renders children; redirects live in the index and $username leaves.
export const Route = createFileRoute("/rates")({
  component: () => <Outlet />,
});
