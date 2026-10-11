import { createFileRoute, Outlet } from "@tanstack/react-router";

// Parent only renders children; the store home and its sharing details live in clothes/index.tsx.
export const Route = createFileRoute("/clothes")({
  component: () => <Outlet />,
});
