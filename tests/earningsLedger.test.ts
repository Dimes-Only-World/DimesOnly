import { describe, it, expect } from "vitest";
import { canRequestPayout, computeLedger, payPeriodOf } from "../src/lib/earningsLedger";

describe("earnings ledger", () => {
  it("pending and approved requests move out of Available", () => {
    const l = computeLedger(1000, [
      { amount: 300, request_status: "pending" },
      { amount: 200, request_status: "processing" },
    ]);
    expect(l.inProcessing).toBe(500);
    expect(l.available).toBe(500);
  });

  it("paid requests reduce Available and count as paid", () => {
    const l = computeLedger(1000, [{ amount: 400, request_status: "completed" }]);
    expect(l.paid).toBe(400);
    expect(l.available).toBe(600);
  });

  it("rejected, cancelled and refunded requests return to Available", () => {
    const l = computeLedger(1000, [
      { amount: 300, request_status: "failed" },
      { amount: 300, request_status: "cancelled" },
      { amount: 300, request_status: "refunded" },
    ]);
    expect(l.available).toBe(1000);
  });

  it("requires $250 minimum and no open request", () => {
    expect(canRequestPayout(249.99, [])).toBe(false);
    expect(canRequestPayout(250, [])).toBe(true);
    expect(canRequestPayout(500, [{ amount: 250, request_status: "pending" }])).toBe(false);
  });

  it("pay periods split on the 15th", () => {
    expect(payPeriodOf("2026-10-14T12:00:00")?.key).toBe("2026-10-A");
    expect(payPeriodOf("2026-10-15T12:00:00")?.key).toBe("2026-10-B");
  });
});
