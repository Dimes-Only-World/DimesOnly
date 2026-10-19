import { describe, it, expect } from "vitest";
import { lateFeeStatus } from "./rentalExtensionRules";
const H = 3_600_000;
describe("late fee hourly rate", () => {
  it("uses admin hourly rate when set: $100 + 3h × $20", () => {
    expect(lateFeeStatus(0, 5 * H + 1, 240, 20).lateFee).toBe(160);
  });
  it("falls back to daily ÷ 24 when hourly rate blank", () => {
    expect(lateFeeStatus(0, 5 * H + 1, 240, null).lateFee).toBe(130);
  });
  it("no fee inside 2-hour grace", () => {
    expect(lateFeeStatus(0, 2 * H, 240, 20).isLate).toBe(false);
  });
});
