import { createFileRoute } from "@tanstack/react-router";
import AccountProfile from "@/pages/rentals/AccountProfile";
import { rentalsHead } from "@/lib/rentals-head";

export const Route = createFileRoute("/account/profile")({
  component: AccountProfile,
  head: () => rentalsHead("Profile — Best Rental Cars", "Update your name, phone, email, driver's license and password.", "/account/profile"),
});
