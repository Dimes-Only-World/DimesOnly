// Audiences for Ready-to-Send messages (mirrored in supabase/functions/make-money).
export const MESSAGE_AUDIENCES = [
  { value: "normal_female", label: "Normal Females" },
  { value: "dimes", label: "Dimes" },
  { value: "male", label: "Males" },
  { value: "business_owner", label: "Business Owners" },
] as const;

export type MessageAudience = "all" | (typeof MESSAGE_AUDIENCES)[number]["value"];

export const audienceLabel = (a: string) =>
  a === "all" ? "Everyone" : MESSAGE_AUDIENCES.find((x) => x.value === a)?.label ?? "Everyone";

/** Messages for the chosen audience; "Everyone" messages appear in every group. */
export function messagesForAudience<T extends { audience?: string | null }>(list: T[], audience: string): T[] {
  const isAll = (m: T) => !m.audience || m.audience === "all";
  const specific = list.filter((m) => !isAll(m) && m.audience === audience);
  const everyone = list.filter(isAll);
  // Group-specific messages first; "Everyone" messages always come last.
  return [...specific, ...everyone];
}
