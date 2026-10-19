import { describe, it, expect } from "vitest";
import { cancellationQuote } from "@/lib/rentalCancellation";

const H = 3_600_000, D = 24 * H;
const start = Date.UTC(2026, 10, 10, 12);
const base = { bookedAt: start - 10 * D, startAt: start, dailyRent: 100, tripFeePerDay: 20, amountPaid: 1000 };

describe("rental cancellation", () => {
  it("is free more than 24h before start", () => {
    const q = cancellationQuote({ ...base, now: start - 25 * H, endAt: start + 5 * D });
    expect(q.fee).toBe(0);
    expect(q.refund).toBe(1000);
  });
  it("is free within 1 hour of a booking made inside 24h", () => {
    const q = cancellationQuote({ ...base, bookedAt: start - 10 * H, now: start - 9.5 * H, endAt: start + 2 * D });
    expect(q.fee).toBe(0);
  });
  it("keeps 1 day + half delivery for late cancel on trips over 3 days", () => {
    const q = cancellationQuote({ ...base, now: start - 5 * H, endAt: start + 5 * D, deliveryFee: 50 });
    expect(q.fee).toBe(145);
    expect(q.refund).toBe(855);
  });
  it("keeps half a day for late cancel on short trips", () => {
    const q = cancellationQuote({ ...base, now: start - 5 * H, endAt: start + 2 * D });
    expect(q.fee).toBe(60);
  });
  it("no-show keeps 2 days on long trips, 1 day on short trips", () => {
    expect(cancellationQuote({ ...base, now: start + H, endAt: start + 5 * D }).fee).toBe(240);
    expect(cancellationQuote({ ...base, now: start + H, endAt: start + 2 * D }).fee).toBe(120);
  });
});
