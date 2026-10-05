import { describe, it, expect } from "vitest";
import { buildNacha, validRouting } from "../src/lib/nacha";

const cfg = { companyName: "Dimes Only", companyId: "1123456789", originRouting: "021000021", originBankName: "Chase" };

describe("NACHA export", () => {
  it("every record is exactly 94 characters and blocks of 10", () => {
    const { text } = buildNacha(cfg, [
      { name: "Jane Doe", routing: "021000021", account: "123456", type: "checking", amount: 300, id: "abc" },
    ], new Date(2026, 9, 15));
    const lines = text.split("\n");
    expect(lines.length % 10).toBe(0);
    lines.forEach((l) => expect(l.length).toBe(94));
  });

  it("totals credits in cents", () => {
    const r = buildNacha(cfg, [
      { name: "A", routing: "021000021", account: "1", type: "checking", amount: 250.5, id: "a" },
      { name: "B", routing: "021000021", account: "2", type: "savings", amount: 300, id: "b" },
    ], new Date());
    expect(r.totalCents).toBe(55050);
  });

  it("validates routing checksum", () => {
    expect(validRouting("021000021")).toBe(true);
    expect(validRouting("021000022")).toBe(false);
  });
});
