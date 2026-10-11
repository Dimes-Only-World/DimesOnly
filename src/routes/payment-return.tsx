import { createFileRoute } from "@tanstack/react-router";
import PaymentStatusHandler from "@/components/PaymentStatusHandler";

export const Route = createFileRoute("/payment-return")({
  component: PaymentStatusHandler,
});
