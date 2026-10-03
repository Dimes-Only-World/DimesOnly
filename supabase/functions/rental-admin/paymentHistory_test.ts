import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { paymentMethodLabel, summarizePayments, validPaymentDate, validPaymentMethod, type PaymentHistoryRow } from "./paymentHistory.ts";

const row = (method: PaymentHistoryRow["payment_method"], amount: number): PaymentHistoryRow => ({
  id: crypto.randomUUID(), booking_id: crypto.randomUUID(), payment_type: "booking", paid_at: "2026-10-03T12:00:00Z",
  payment_method: method, amount, payment_reference: null, receipt_path: null, renter_username: "member", vehicle_label: "2024 Mercedes S500",
});

Deno.test("payment history totals each method and grand total", () => {
  assertEquals(summarizePayments([row("paypal", 100), row("cash", 50.25), row("cashapp", 25.75)]), {
    count: 3, total: 176, paypal: 100, cash: 50.25, cashapp: 25.75,
  });
});

Deno.test("payment history uses the requested method labels", () => {
  assertEquals([paymentMethodLabel("paypal"), paymentMethodLabel("cash"), paymentMethodLabel("cashapp")], ["PayPal", "Cash", "Cash App"]);
});

Deno.test("payment history accepts only supported filters", () => {
  assertEquals([validPaymentDate("2026-10-03"), validPaymentDate("10/03/2026"), validPaymentMethod("cashapp"), validPaymentMethod("card")], [true, false, true, false]);
});