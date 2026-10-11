import { useEffect } from "react";
import { cleanup, render, waitFor } from "@testing-library/react";
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Route as RentalsLayout } from "@/routes/rentals";
import { Route as HostLayout } from "@/routes/rentals/host";
import { Route as PurchaseLayout } from "@/routes/rentals/purchase";

afterEach(cleanup);

describe("rental child navigation", () => {
  for (const target of ["/rentals", "/rentals/car-1", "/rentals/list", "/rentals/my-fleet", "/rentals/pay/booking-1?token=approval", "/rentals/host", "/rentals/host/apply", "/rentals/purchase", "/rentals/purchase/car-1"]) {
    it(`mounts the requested page at ${target}`, async () => {
      const mounted = vi.fn();
      function Page() { useEffect(() => { mounted(); }, []); return null; }
      const root = createRootRoute();
      const rentalComponent = RentalsLayout.options.component;
      const hostComponent = HostLayout.options.component;
      const purchaseComponent = PurchaseLayout.options.component;
      if (!rentalComponent || !hostComponent || !purchaseComponent) throw new Error("Rental layouts are missing");
      const layout = createRoute({ getParentRoute: () => root, path: "rentals", component: rentalComponent });
      const host = createRoute({ getParentRoute: () => layout, path: "host", component: hostComponent });
      const purchase = createRoute({ getParentRoute: () => layout, path: "purchase", component: purchaseComponent });
      const children = ["/", "$id", "list", "my-fleet", "pay/$bookingId"].map(path => createRoute({ getParentRoute: () => layout, path, component: Page }));
      host.addChildren(["/", "apply"].map(path => createRoute({ getParentRoute: () => host, path, component: Page })));
      purchase.addChildren(["/", "$vehicleId"].map(path => createRoute({ getParentRoute: () => purchase, path, component: Page })));
      const router = createRouter({ routeTree: root.addChildren([layout.addChildren([...children, host, purchase])]), history: createMemoryHistory({ initialEntries: [target] }) });
      render(<RouterProvider router={router} />);
      await waitFor(() => expect(mounted).toHaveBeenCalledTimes(1));
      expect(router.state.location.pathname).toBe(target.split("?")[0]);
      if (target.includes("token=")) expect(router.state.location.search).toEqual({ token: "approval" });
      if (target.endsWith("/car-1")) expect(router.state.matches.at(-1)?.params).toMatchObject(target.includes("purchase") ? { vehicleId: "car-1" } : { id: "car-1" });
    });
  }
});