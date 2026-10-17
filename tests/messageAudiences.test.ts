import { describe, it, expect } from "vitest";
import { messagesForAudience } from "../src/lib/messageAudiences";

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
