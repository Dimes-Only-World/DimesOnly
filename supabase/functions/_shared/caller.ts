// Shared caller verification for edge functions.
// Tokens are issued by authenticate-user as `${userId}.${issuedAtMs}.${hmac}`.
import { createClient } from "npm:@supabase/supabase-js@2";

export const AUTH_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-admin-token, x-user-token";

const encoder = new TextEncoder();
const ADMIN_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const USER_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function toBase64Url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function signingSecret(): string {
  return Deno.env.get("CUSTOM_AUTH_SIGNING_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
}

export async function verifyCustomToken(token: string | null, maxAgeMs: number): Promise<string | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, issuedAt, sig] = parts;
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return null;
  const ts = Number(issuedAt);
  if (!Number.isFinite(ts) || Date.now() - ts > maxAgeMs || ts - Date.now() > 60_000) return null;
  const secret = signingSecret();
  if (!secret) return null;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = toBase64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(`${userId}.${issuedAt}`)));
  return expected === sig ? userId : null;
}

/** Returns the verified caller's user id (Supabase JWT or signed custom token), else null. */
export async function getCallerId(req: Request): Promise<string | null> {
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (bearer && bearer !== anon) {
    try {
      const client = createClient(Deno.env.get("SUPABASE_URL")!, anon || bearer, {
        global: { headers: { Authorization: `Bearer ${bearer}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data } = await client.auth.getUser(bearer);
      if (data?.user?.id) return data.user.id;
    } catch { /* fall through */ }
  }
  return await verifyCustomToken(req.headers.get("x-user-token"), USER_MAX_AGE_MS);
}

/** Returns the verified admin id from the x-admin-token header (role checked), else null. */
export async function getVerifiedAdminId(req: Request): Promise<string | null> {
  const id = await verifyCustomToken(req.headers.get("x-admin-token"), ADMIN_MAX_AGE_MS);
  if (!id) return null;
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data } = await admin.rpc("check_admin_by_user_id", { _user_id: id });
  return data === true ? id : null;
}

/** True when the request carries the service role key (cron / internal calls). */
export function isServiceCall(req: Request): boolean {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const auth = req.headers.get("authorization") || "";
  return !!key && auth === `Bearer ${key}`;
}

export function escapeHtml(v: unknown): string {
  return String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
