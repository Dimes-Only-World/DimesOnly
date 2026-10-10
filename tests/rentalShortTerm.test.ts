import { describe, it, expect } from "vitest";
import { shortTermTotal, sixMonthLeaseTotal } from "../src/lib/rentalShortTerm";

const car = { day_rate: 50, weekly_rate: 300, monthly_rate: 1000 };

describe("short-term rental pricing", () => {
  it("9 days = 1 week + 2 days", () => expect(shortTermTotal(car, 9)).toBe(400));
  it("14 days = 2 weeks", () => expect(shortTermTotal(car, 14)).toBe(600));
  it("24 days = 3 weeks + 3 days", () => expect(shortTermTotal(car, 24)).toBe(1050));
  it("28 days = monthly rate", () => expect(shortTermTotal(car, 28)).toBe(1000));
  it("30 days = monthly rate (2 days free)", () => expect(shortTermTotal(car, 30)).toBe(1000));
  it("6 months = daily × 156", () => expect(sixMonthLeaseTotal(car)).toBe(7800));
});
