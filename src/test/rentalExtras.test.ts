import { describe, it, expect } from "vitest";
import { rentalExtras, extrasDays } from "@/lib/rentalExtras";

describe("rental extras", () => {
  it("standard protection is $34 per day", () => {
    expect(rentalExtras({}, "limited", "standard", 3).protectionTotal).toBe(102);
  });
  it("minimum protection is $27 per day", () => {
    expect(rentalExtras({}, "limited", "minimum", 2).protectionTotal).toBe(54);
  });
  it("own insurance adds nothing", () => {
    expect(rentalExtras({}, "limited", "own", 5).total).toBe(0);
  });
  it("unlimited miles adds the car's daily rate per day", () => {
    expect(rentalExtras({ unlimited_mileage_rate: 16 }, "unlimited", "own", 4).mileageTotal).toBe(64);
  });
  it("weekly bookings count at least 7 days", () => {
    expect(extrasDays("weekly", 3)).toBe(7);
  });
});
