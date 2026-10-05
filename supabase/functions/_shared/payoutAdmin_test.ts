import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { KEEP, OVERRIDE, RENTAL_SPLIT, keepRateFor } from "./payoutAdmin.ts";

Deno.test("rental revenue splits 85% direct, 10% upline, and 5% company", () => {
  assertEquals(RENTAL_SPLIT.referrer, 0.85);
  assertEquals(RENTAL_SPLIT.upline, 0.10);
  assertEquals(RENTAL_SPLIT.company, 0.05);
  assertEquals(KEEP.rentals, 0.05);
  assertEquals(OVERRIDE.rentals, 0.10);
});

Deno.test("company receives all rental revenue when it is the direct referrer", () => {
  assertEquals(keepRateFor("rentals", "Company", null), 1);
});

Deno.test("company receives the rental upline share when a member is direct", () => {
  assertEquals(keepRateFor("rentals", "member", "Company"), 0.15);
});