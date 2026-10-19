import { describe, it, expect } from "vitest";
import { checkBookingTotal } from "./bookingTotalCheck";

const car = { day_rate: 100, weekly_rate: 600, monthly_rate: 2000, security_deposit: 250 };

describe("checkBookingTotal", () => {
  it("matches a 3-day booking with deposit", () => {
    const r = checkBookingTotal({ rental_type: "daily", start_date: "2026-10-01T10:00:00Z", end_date: "2026-10-04T10:00:00Z", total_price: 550 }, car)!;
    expect(r.expected).toBe(550);
    expect(r.matches).toBe(true);
  });
  it("flags a saved total that is too low", () => {
    const r = checkBookingTotal({ rental_type: "daily", start_date: "2026-10-01T10:00:00Z", end_date: "2026-10-04T10:00:00Z", total_price: 300 }, car)!;
    expect(r.matches).toBe(false);
    expect(r.difference).toBe(-250);
  });
  it("subtracts promo and hold credit and adds protection", () => {
    const r = checkBookingTotal({ rental_type: "weekly", start_date: "2026-10-01T10:00:00Z", end_date: "2026-10-08T10:00:00Z", total_price: 0, protection_total: 189, discount_amount: 50, hold_credit: 150 }, car)!;
    expect(r.expected).toBe(600 + 189 - 50 - 150 + 250);
  });
  it("skips rent-to-own", () => {
    expect(checkBookingTotal({ rental_type: "rent_to_own", start_date: null, end_date: null, total_price: 1 }, car)).toBeNull();
  });
});
