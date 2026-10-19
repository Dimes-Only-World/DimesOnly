import { describe, it, expect } from "vitest";
import { blockedUntil, bookingConflict } from "@/lib/rentalAvailability";

const t = (s: string) => new Date(s).getTime();
const booking = [{ start_date: "2026-10-22T10:00:00Z", end_date: "2026-10-29T10:00:00Z" }];

describe("rental availability", () => {
  it("is bookable 4 days before another renter's pickup", () => {
    expect(blockedUntil(booking, t("2026-10-18T09:00:00Z"))).toBeNull();
  });
  it("blocks from 3 days before pickup until the rental ends", () => {
    expect(blockedUntil(booking, t("2026-10-19T11:00:00Z"))).toBe(t("2026-10-29T10:00:00Z"));
  });
  it("rejects a booking that starts before the blocking rental ends", () => {
    expect(bookingConflict(booking, t("2026-10-20T10:00:00Z"), t("2026-10-21T10:00:00Z"), t("2026-10-20T08:00:00Z"))).not.toBeNull();
  });
  it("allows a booking after the blocking rental ends", () => {
    expect(bookingConflict(booking, t("2026-10-30T10:00:00Z"), t("2026-10-31T10:00:00Z"), t("2026-10-20T08:00:00Z"))).toBeNull();
  });
});
