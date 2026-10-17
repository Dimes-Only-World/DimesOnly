import { describe, it, expect } from "vitest";
import { messagesForAudience } from "@/lib/messageAudiences";

const list = [
  { id: "a", audience: "all" },
  { id: "d", audience: "dimes" },
  { id: "m", audience: "male" },
  { id: "b", audience: "business_owner" },
  { id: "n", audience: "normal_female" },
];

describe("messagesForAudience", () => {
  it("Dimes see Dimes messages plus Everyone messages only", () => {
    expect(messagesForAudience(list, "dimes").map((m) => m.id)).toEqual(["a", "d"]);
  });
  it("Males do not see Normal Female messages", () => {
    expect(messagesForAudience(list, "male").map((m) => m.id)).toEqual(["a", "m"]);
  });
});

import { describe as d2, it as i2, expect as e2 } from "vitest";
import { messagesForAudience as mfa } from "@/lib/messageAudiences";
d2("everyone last", () => {
  i2("puts Everyone messages after group messages", () => {
    const r = mfa([{ id: "a", audience: "all" }, { id: "b", audience: "dimes" }], "dimes");
    e2(r.map((m) => m.id)).toEqual(["b", "a"]);
  });
});
