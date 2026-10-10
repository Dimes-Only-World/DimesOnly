import { describe, it, expect } from "vitest";
import { ratesFromMonthlyPayment } from "../src/lib/vehicleCostPricing";

describe("ratesFromMonthlyPayment", () => {
  const r = ratesFromMonthlyPayment(500);
  it("monthly is payment + $752", () => expect(r.monthly_rate).toBe(1252));
  it("weekly equals the monthly payment", () => expect(r.weekly_rate).toBe(500));
  it("daily is payment/30 + $35", () => expect(r.day_rate).toBe(51.67));
  it("3+ day rate is 20% off daily", () => expect(r.three_day_rate).toBe(41.34));
});
