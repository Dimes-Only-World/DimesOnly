import { describe, it, expect } from "vitest";
import { isDime } from "../src/lib/membership";

describe("Rate share visibility", () => {
  it("Exotic and Stripper members are Dimes", () => {
    expect(isDime({ user_type: "exotic" })).toBe(true);
    expect(isDime({ userType: "stripper" })).toBe(true);
    expect(isDime({ user_type: " Exotic " })).toBe(true);
  });

  it("Males, Normal Females and Business Owners are not Dimes", () => {
    expect(isDime({ user_type: "normal", gender: "female" })).toBe(false);
    expect(isDime({ user_type: "male", gender: "male" })).toBe(false);
    expect(isDime({ user_type: "business_owner" })).toBe(false);
    expect(isDime({ user_type: "business owner", gender: "female" })).toBe(false);
    expect(isDime(null)).toBe(false);
  });
});
