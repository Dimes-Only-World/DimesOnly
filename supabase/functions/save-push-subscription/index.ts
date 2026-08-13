import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-dimes-auth-token, x-internal-secret",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const TOKEN_SECRET = Deno.env.get("CUSTOM_AUTH_SIGNING_SECRET") || SERVICE_ROLE_KEY;

const encoder = new TextEncoder();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const toBase64Url = (bytes: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const sign = async (payload: string) => {
  if (!TOKEN_SECRET) return "";
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(TOKEN_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toBase64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
};

const timingSafeEqual = (a: string, b: string) => {
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i];
  return diff === 0;
};

const verifyCustomToken = async (token: string) => {
  const parts = token.split(".");
  if (parts.length !== 3) return "";
  const [userId, issuedAt, signature] = parts;
  if (!userId || !issuedAt || !signature) return "";

  const issued = Number(issuedAt);
  const maxAgeMs = 1000 * 60 * 60 * 24 * 30;
  if (!Number.isFinite(issued) || Date.now() - issued > maxAgeMs) return "";

  const expected = await sign(`${userId}.${issuedAt}`);
  if (!expected || !timingSafeEqual(expected, signature)) return "";
  return userId;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json({ error: "Server not configured" }, 500);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const body = await req.json().catch(() => ({}));
    const requestedUserId = String(body.user_id ?? "").trim();
    const playerId = String(body.player_id ?? "").trim();
    const platform = String(body.platform ?? "web").trim().slice(0, 40) || "web";

    if (!requestedUserId) return json({ error: "user_id is required" }, 400);
    if (!playerId || playerId.length > 512) return json({ error: "Valid player_id is required" }, 400);

    let callerUserId = "";
    const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (bearer && bearer !== Deno.env.get("SUPABASE_ANON_KEY")) {
      const { data } = await admin.auth.getUser(bearer);
      callerUserId = data.user?.id ?? "";
    }

    if (!callerUserId) {
      callerUserId = await verifyCustomToken(req.headers.get("x-dimes-auth-token") ?? "");
    }

    if (!callerUserId || callerUserId !== requestedUserId) return json({ error: "Unauthorized" }, 401);

    const { data: userRow, error: userError } = await admin
      .from("users")
      .select("id, is_active")
      .eq("id", callerUserId)
      .maybeSingle();

    if (userError || !userRow || userRow.is_active === false) return json({ error: "Unauthorized" }, 401);

    const { error } = await admin.from("push_subscriptions").upsert(
      {
        user_id: callerUserId,
        player_id: playerId,
        platform,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "player_id" },
    );

    if (error) {
      console.error("push subscription save failed", error.message);
      return json({ error: "Could not save push subscription" }, 500);
    }

    return json({ success: true });
  } catch (e) {
    console.error("save-push-subscription failed", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});