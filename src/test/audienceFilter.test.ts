import { describe, it, expect } from "vitest";
import { buildAudienceConditions } from "../../supabase/functions/_shared/audienceFilter";

describe("buildAudienceConditions", () => {
  it("targets every male member by gender, not user_type", () => {
    expect(buildAudienceConditions("user_type", "male")).toEqual([
      { column: "gender", value: "male" },
    ]);
  });
  it("keeps Normal Female female-only", () => {
    expect(buildAudienceConditions("user_type", "normal")).toEqual([
      { column: "user_type", value: "normal" },
      { column: "gender", value: "female" },
    ]);
  });
  it("keeps Dimes as exotic + stripper", () => {
    expect(buildAudienceConditions("user_type", "dimes")).toEqual([
      { column: "user_type", value: ["exotic", "stripper"] },
    ]);
  });
  it("passes through other user types", () => {
    expect(buildAudienceConditions("user_type", "stripper")).toEqual([
      { column: "user_type", value: "stripper" },
    ]);
    expect(buildAudienceConditions("user_type", "business_owner")).toEqual([
      { column: "user_type", value: "business_owner" },
    ]);
  });
  it("returns null for all/username audiences", () => {
    expect(buildAudienceConditions("all", "")).toBeNull();
    expect(buildAudienceConditions("username", "someone")).toBeNull();
  });
});
