// AES-GCM encryption for Social Security numbers. Key derived from a server-only secret.
const enc = new TextEncoder();
async function key() {
  const secret = Deno.env.get("SSN_ENCRYPTION_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!secret) throw new Error("Missing encryption secret");
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(`ssn:${secret}`));
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
}
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function encryptSsn(ssn: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(), enc.encode(ssn)));
  return `${b64(iv)}.${b64(ct)}`;
}
export async function decryptSsn(payload: string) {
  const [iv, ct] = payload.split(".");
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, await key(), unb64(ct));
  const d = new TextDecoder().decode(pt);
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}
export const ssnDigits = (v: unknown) => typeof v === "string" ? v.replace(/\D/g, "") : "";
export const ssnValid = (d: string) => /^\d{9}$/.test(d) && !/^(000|666|9)/.test(d) && d.slice(3, 5) !== "00" && d.slice(5) !== "0000";
