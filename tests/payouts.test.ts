import { describe, it, expect } from "vitest";
import { payrollBand, sumAmounts, toCsv } from "../src/lib/payouts";

describe("payout rules", () => {
  it("under $250 payroll excludes exactly $250", () => {
    expect(payrollBand(249.99, "under")).toBe(true);
    expect(payrollBand(250, "under")).toBe(false);
    expect(payrollBand(250, "over")).toBe(true);
  });
  it("amount column total sums to cents", () => {
    expect(sumAmounts([{ amount: 2 }, { amount: 24 }, { amount: "1.76" }])).toBe(27.76);
  });
  it("csv neutralizes formula injection", () => {
    expect(toCsv(["a"], [["=SUM(1)"]])).toBe('"a"\n"\'=SUM(1)"');
  });
});
