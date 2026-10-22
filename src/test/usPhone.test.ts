import { describe, it, expect } from "vitest";
import { normalizeUsPhone, formatUsPhoneInput } from "@/lib/usPhone";

describe("U.S. phone numbers", () => {
  it("formats 10 digits as +1 (xxx) xxx-xxxx", () => expect(normalizeUsPhone("9518135521")).toBe("+1 (951) 813-5521"));
  it("treats a leading 1 as the country code, keeping all 10 digits", () =>
    expect(normalizeUsPhone("19518135521")).toBe("+1 (951) 813-5521"));
  it("rejects a truncated number", () => expect(normalizeUsPhone("195181355")).toBeNull());
  it("typing a leading 1 does not eat the area code", () => expect(formatUsPhoneInput("19518135521")).toBe("+1 (951) 813-5521"));
});
