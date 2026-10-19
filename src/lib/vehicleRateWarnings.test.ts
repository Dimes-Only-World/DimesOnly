import { describe, it, expect } from "vitest";
import { vehicleRateWarnings } from "./vehicleRateWarnings";

describe("vehicleRateWarnings", () => {
  it("is quiet for sensible rates", () => {
    expect(vehicleRateWarnings({ day_rate: 100, three_day_rate: 90, weekly_rate: 600, monthly_rate: 2000 })).toEqual([]);
  });
  it("flags weekly above 7 days of day rate", () => {
    expect(vehicleRateWarnings({ day_rate: 100, weekly_rate: 701 })).toHaveLength(1);
  });
  it("flags monthly above 30 days of day rate", () => {
    expect(vehicleRateWarnings({ day_rate: 50, monthly_rate: 1501 })).toHaveLength(1);
  });
  it("flags reversed weekly/monthly", () => {
    expect(vehicleRateWarnings({ weekly_rate: 800, monthly_rate: 700 })[0]).toMatch(/reversed/);
  });
  it("flags 3+ day above day rate", () => {
    expect(vehicleRateWarnings({ day_rate: 100, three_day_rate: 120 })).toHaveLength(1);
  });
});
