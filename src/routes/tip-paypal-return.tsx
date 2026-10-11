import { createFileRoute } from "@tanstack/react-router";
import TipPayPalReturn from "@/pages/TipPayPalReturn";

export const Route = createFileRoute("/tip-paypal-return")({
  component: TipPayPalReturn,
});
