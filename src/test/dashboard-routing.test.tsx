import { useEffect } from "react";
import { cleanup, render, waitFor } from "@testing-library/react";
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Route as DashboardLayout } from "@/routes/dashboard";
import { Route as DashboardIndex } from "@/routes/dashboard.index";

afterEach(cleanup);

describe("Dashboard navigation", () => {
  for (const path of ["/dashboard/profile", "/dashboard"]) {
    it(`mounts the profile tab when opening ${path}`, async () => {
      const mounted = vi.fn();
      function ProfileTab() {
        useEffect(() => { mounted(); }, []);
        return null;
      }
      const root = createRootRoute();
      const dashboard = createRoute({
        getParentRoute: () => root,
        path: "dashboard",
        component: DashboardLayout.options.component,
      });
      const index = createRoute({
        getParentRoute: () => dashboard,
        path: "/",
        beforeLoad: DashboardIndex.options.beforeLoad,
      });
      const tab = createRoute({ getParentRoute: () => dashboard, path: "$tab", component: ProfileTab });
      const router = createRouter({
        routeTree: root.addChildren([dashboard.addChildren([index, tab])]),
        history: createMemoryHistory({ initialEntries: [path] }),
      });
      render(<RouterProvider router={router} />);
      await waitFor(() => expect(mounted).toHaveBeenCalled());
      expect(router.state.location.pathname).toBe("/dashboard/profile");
    });
  }
});