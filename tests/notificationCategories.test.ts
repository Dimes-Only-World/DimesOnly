import { describe, it, expect } from "vitest";
import { categorizeNotification } from "../src/lib/notificationCategories";

describe("categorizeNotification", () => {
  it("uses the admin-chosen category first", () => {
    expect(categorizeNotification("admin", null, { category: "media" })).toBe("media");
  });
  it("puts commissions and payouts in earnings", () => {
    expect(categorizeNotification("payout", null)).toBe("earnings");
  });
  it("puts referral signups in referrals", () => {
    expect(categorizeNotification("referral", null)).toBe("referrals");
  });
  it("puts direct messages in messages", () => {
    expect(categorizeNotification("message", null)).toBe("messages");
  });
  it("falls back to account", () => {
    expect(categorizeNotification("membership", null)).toBe("account");
  });
});
