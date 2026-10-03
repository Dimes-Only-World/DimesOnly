import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { extensionAmounts, mileageIsValid } from "./rules.ts";

Deno.test("extension fee is 4.5 percent plus 1.27", () => {
  assertEquals(extensionAmounts(2, 100), { extensionPrice: 200, transactionFee: 10.27, totalCharged: 210.27 });
});

Deno.test("mileage must be a greater whole number", () => {
  assertEquals(mileageIsValid(38542, 38541), true);
  assertEquals(mileageIsValid(38541, 38541), false);
  assertEquals(mileageIsValid(38541.5, 38541), false);
});

import { extensionCharge, lateFeeStatus } from "./rules.ts";
const H = 3_600_000;
const due = Date.parse("2026-09-22T10:40:00Z"); // 3:40 AM LA

Deno.test("no late fee within 2h grace", () => {
  assertEquals(lateFeeStatus(due, due + 2 * H, 48).isLate, false);
});
Deno.test("late fee is $100 + full hours after grace x daily/24, waived same day under 12h", () => {
  const s = lateFeeStatus(due, due + 5.5 * H, 48);
  assertEquals([s.hoursLate, s.lateFee, s.waived], [3, 106, true]);
});
Deno.test("no waiver at 12h or more", () => {
  const s = lateFeeStatus(due, due + 12 * H, 48);
  assertEquals([s.lateFee, s.waived], [120, false]);
});
Deno.test("deposit applies to late fee first, fee charged on remainder + extension", () => {
  const c = extensionCharge({ days: 1, dailyRate: 48, dueMs: due, nowMs: due + 12 * H, depositAvailable: 50, useDeposit: true });
  assertEquals([c.depositApplied, c.lateFeeRemainder, c.extensionPrice, c.transactionFee, c.totalCharged], [50, 70, 48, 6.58, 124.58]);
});
