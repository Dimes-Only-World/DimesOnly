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
