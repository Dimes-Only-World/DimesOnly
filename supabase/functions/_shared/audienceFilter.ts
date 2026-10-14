// Shared audience targeting rules for admin broadcasts.
// "male" targets every member whose gender is male (most male fans are stored
// as user_type "normal"), and "normal" is female-only, so broadcasts never
// cross genders. Keep in sync with the AdminNotificationTab audience labels.

export interface AudienceCondition {
  column: string;
  value: string | string[];
}

export function buildAudienceConditions(
  audience: string,
  audienceValue: string
): AudienceCondition[] | null {
  if (audience !== "user_type" || !audienceValue) return null;
  switch (audienceValue) {
    case "dimes":
      return [{ column: "user_type", value: ["exotic", "stripper"] }];
    case "male":
      return [{ column: "gender", value: "male" }];
    case "normal":
      return [
        { column: "user_type", value: "normal" },
        { column: "gender", value: "female" },
      ];
    case "business_owner":
      return [{ column: "user_type", value: "business_owner" }];
    default:
      return [{ column: "user_type", value: audienceValue }];
  }
}
