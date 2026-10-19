import { createFileRoute } from "@tanstack/react-router";
import AccountHome from "@/pages/rentals/AccountHome";
import { rentalsHead } from "@/lib/rentals-head";

export const Route = createFileRoute("/account/")({
  component: AccountHome,
  head: () => rentalsHead("My Account — Best Rental Cars", "Your rentals, purchases and profile in one place.", "/account"),
});
