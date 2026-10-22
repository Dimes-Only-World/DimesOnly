/** Normalizes a U.S. phone to "+1 (xxx) xxx-xxxx"; a leading 1 is the country code. Returns null if invalid. */
export function normalizeUsPhone(input: unknown): string | null {
  let d = String(input ?? "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  if (d.length !== 10 || /^[01]/.test(d)) return null;
  return `+1 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/** Live input formatting: strips a typed country code, shows "+1 (xxx) xxx-xxxx" as you type. */
export function formatUsPhoneInput(input: string): string {
  let d = input.replace(/\D/g, "");
  if (input.trim().startsWith("+1") || (d.length > 10 && d.startsWith("1")) || d.startsWith("1")) d = d.slice(1);
  d = d.slice(0, 10);
  if (!d) return "";
  let out = `+1 (${d.slice(0, 3)}`;
  if (d.length > 3) out += `) ${d.slice(3, 6)}`;
  if (d.length > 6) out += `-${d.slice(6)}`;
  return out;
}
