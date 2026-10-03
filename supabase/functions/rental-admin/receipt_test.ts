import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { receiptDetails } from "./receipt.ts";

Deno.test("cash receipt includes booking code, amount, method, and collector", () => {
  assertEquals(receiptDetails({ bookingId: "abc12345-0000", amount: 538.5, method: "cash", reference: "Joseph Weaver", paidAt: "2026-10-03T20:51:00Z" }), {
    bookingCode: "ABC12345", amount: 538.5, methodLabel: "Cash", referenceLabel: "Collected by", reference: "Joseph Weaver",
  });
});

Deno.test("Cash App receipt labels its transaction reference", () => {
  assertEquals(receiptDetails({ bookingId: "def67890-0000", amount: 616.45, method: "cashapp", reference: "$sender", paidAt: "2026-10-03T20:51:00Z" }).referenceLabel, "Transaction reference");
});