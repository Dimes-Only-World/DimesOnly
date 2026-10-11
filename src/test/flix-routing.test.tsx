import { useEffect } from "react";
import { cleanup, render, waitFor } from "@testing-library/react";
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Route as FlixLayout } from "@/routes/flix";

afterEach(cleanup);

describe("FlameFlix navigation", () => {
  for (const target of ["/flix", "/flix/browse", "/flix/browse?sort=new", "/flix/search", "/flix/pricing", "/flix/earn"]) {
    it(`mounts the requested page at ${target}`, async () => {
      const mounted = vi.fn();
      function Page() {
        useEffect(() => { mounted(); }, []);
        return null;
      }
      const root = createRootRoute();
      const layout = createRoute({ getParentRoute: () => root, path: "flix", component: FlixLayout.options.component });
      const children = ["/", "browse", "search", "pricing", "earn"].map(path => createRoute({ getParentRoute: () => layout, path, component: Page }));
      const router = createRouter({
        routeTree: root.addChildren([layout.addChildren(children)]),
        history: createMemoryHistory({ initialEntries: [target] }),
      });
      render(<RouterProvider router={router} />);
      await waitFor(() => expect(mounted).toHaveBeenCalledTimes(1));
      expect(router.state.location.pathname).toBe(target.split("?")[0]);
      if (target.includes("sort=new")) expect(router.state.location.search).toEqual({ sort: "new" });
    });
  }
});