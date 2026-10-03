import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { allowedPickupDate, minimumEndDate, monthlyRentalEndIsValid, monthlyRentalPrice, rentToOwnContractTotal, rentToOwnMonthlyPayment } from "./rules.ts";

Deno.test("pickup may be today through 28 days, never the past", () => {
  const now = new Date("2026-10-03T12:00:00");
  assertEquals(allowedPickupDate("2026-10-02T12:00:00", now), false);
  assertEquals(allowedPickupDate("2026-10-03T10:00:00", now), true);
  assertEquals(allowedPickupDate("2026-10-31T10:00:00", now), true);
  assertEquals(allowedPickupDate("2026-11-01T10:00:00", now), false);
});

Deno.test("long-term is six months and rent-to-own is 48 months", () => {
  assertEquals(minimumEndDate("2026-10-03T10:00:00", "long_term")?.toISOString(), "2027-04-03T10:00:00.000Z");
  assertEquals(minimumEndDate("2026-10-03T10:00:00", "rent_to_own")?.toISOString(), "2030-10-03T10:00:00.000Z");
});

Deno.test("monthly rentals end no more than 28 days after pickup", () => {
  assertEquals(monthlyRentalEndIsValid("2026-10-03T10:00:00", "2026-10-31T10:00:00"), true);
  assertEquals(monthlyRentalEndIsValid("2026-10-03T10:00:00", "2026-10-31T10:01:00"), false);
  assertEquals(monthlyRentalEndIsValid("2026-10-03T10:00:00", "2026-10-03T10:00:00"), false);
});

Deno.test("monthly rentals charge the vehicle monthly rate", () => {
  assertEquals(monthlyRentalPrice(810.63), 810.63);
});

Deno.test("rent-to-own is down payment plus 48 monthly payments less 75 dollars", () => {
  assertEquals(rentToOwnMonthlyPayment(810.63), 810.63);
  assertEquals(rentToOwnContractTotal(810.63, 2800.31), 41635.55);
});