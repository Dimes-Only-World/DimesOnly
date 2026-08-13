import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID") ?? "";
const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY") ?? "";
const INTERNAL_SECRET = Deno.env.get("NOTIFY_INTERNAL_SECRET") ?? "";
const TOKEN_SECRET = Deno.env.get("CUSTOM_AUTH_SIGNING_SECRET") || SERVICE_ROLE_KEY;

const SITE_URL = "https://dimesonly.world";
const DEFAULT_NOTIFICATION_ICON = `${SITE_URL}/notification-icon.png`;
const encoder = new TextEncoder();

interface NotifyPayload {
  user_id?: string;
  user_ids?: string[];
  title?: string;
  message?: string;
  type?: string;
  link?: string | null;
  data?: Record<string, unknown>;
  push?: boolean;
}

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

function toHttpsUrl(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw || raw.startsWith("data:") || raw.startsWith("blob:")) return "";
  try {
    const url = new URL(raw, SITE_URL);
    if (url.protocol !== "https:") return "";
    return url.href;
  } catch {
    return "";
  }
}

function pickNotificationImage(data: Record<string, unknown>): string {
  return (
    toHttpsUrl(data.actor_photo_url) ||
    toHttpsUrl(data.profile_photo_url) ||
    toHttpsUrl(data.notification_icon) ||
    toHttpsUrl(data.image_url) ||
    toHttpsUrl(data.avatar_url)
  );
}

async function sendPush(
  admin: ReturnType<typeof createClient>,
  userIds: string[],
  title: string,
  message: string,
  link: string | null,
  data: Record<string, unknown>,
) {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    console.log("OneSignal not configured; skipping push");
    return { sent: false, reason: "not_configured" };
  }

  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("player_id")
    .in("user_id", userIds);

  if (error) {
    console.error("push_subscriptions lookup failed", error.message);
    return { sent: false, reason: error.message };
  }

  const playerIds = (subs ?? []).map((s: { player_id: string }) => s.player_id).filter(Boolean);
  if (playerIds.length === 0) return { sent: false, reason: "no_devices" };

  const profileImage = pickNotificationImage(data);
  const notificationIcon = profileImage || DEFAULT_NOTIFICATION_ICON;
  const notificationUrl = link ? `${SITE_URL}${link.startsWith("/") ? link : `/${link}`}` : SITE_URL;

  try {
    const postToOneSignal = async (targetKey: "include_subscription_ids" | "include_player_ids") => {
      const payload: Record<string, unknown> = {
        app_id: ONESIGNAL_APP_ID,
        [targetKey]: playerIds,
        headings: { en: title },
        contents: { en: message },
        url: notificationUrl,
        // Facebook-style web push where supported: the teammate's profile photo
        // is the main notification icon; the Dimes logo remains the badge.
        chrome_web_icon: notificationIcon,
        chrome_web_badge: DEFAULT_NOTIFICATION_ICON,
        firefox_icon: notificationIcon,
        large_icon: notificationIcon,
        data,
      };

      if (profileImage) {
        payload.chrome_web_image = profileImage;
        payload.big_picture = profileImage;
      }

      return fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });
    };

    let res = await postToOneSignal("include_subscription_ids");
    let body = await res.json().catch(() => ({}));
    if (!res.ok && res.status === 400) {
      // Older OneSignal apps may still expect the legacy player-id field.
      res = await postToOneSignal("include_player_ids");
      body = await res.json().catch(() => ({}));
    }

    if (!res.ok) {
      console.error("OneSignal error", res.status, JSON.stringify(body));
      return { sent: false, reason: `onesignal_${res.status}` };
    }

    // Prune expired/unregistered devices so they stop polluting future sends.
    const invalid: string[] = Array.isArray(body?.errors?.invalid_player_ids)
      ? body.errors.invalid_player_ids
      : [];
    if (invalid.length > 0) {
      await admin.from("push_subscriptions").delete().in("player_id", invalid);
      console.log("pruned invalid push subscriptions", invalid.length);
    }

    const delivered = playerIds.filter((id) => !invalid.includes(id));
    return { sent: delivered.length > 0, recipients: delivered.length, onesignal_id: body?.id ?? null };

  } catch (e) {
    console.error("OneSignal request failed", e);
    return { sent: false, reason: "request_failed" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const payload = (await req.json().catch(() => ({}))) as NotifyPayload;

    const title = String(payload.title ?? "").trim();
    const message = String(payload.message ?? "").trim();
    if (!title || title.length > 200) return json({ error: "title is required (max 200 chars)" }, 400);
    if (!message || message.length > 1000) return json({ error: "message is required (max 1000 chars)" }, 400);

    const requested = [
      ...(payload.user_id ? [payload.user_id] : []),
      ...(Array.isArray(payload.user_ids) ? payload.user_ids : []),
    ].map(String).filter(Boolean);

    if (requested.length === 0) return json({ error: "user_id or user_ids is required" }, 400);
    if (requested.length > 500) return json({ error: "max 500 recipients per call" }, 400);

    // ---- Authorization -------------------------------------------------
    // Internal callers (other edge functions / cron) pass the shared secret.
    // End users may only notify themselves, verified from their JWT.
    const internalKey = req.headers.get("x-internal-secret") ?? "";
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const isInternal = (INTERNAL_SECRET.length > 0 && internalKey === INTERNAL_SECRET) || token === SERVICE_ROLE_KEY;

    let userIds = requested;

    if (!isInternal) {
      let callerId = "";

      if (token && token !== SUPABASE_ANON_KEY) {
        const { data: userRes } = await admin.auth.getUser(token);
        callerId = userRes?.user?.id ?? "";
      }

      if (!callerId) {
        callerId = await verifyCustomToken(req.headers.get("x-dimes-auth-token") ?? "");
      }

      if (!callerId) return json({ error: "Unauthorized" }, 401);

      const { data: isAdmin } = await admin.rpc("check_admin_by_user_id", { _user_id: callerId });

      if (!isAdmin) {
        const others = requested.filter((id) => id !== callerId);
        if (others.length > 0) return json({ error: "Forbidden" }, 403);
        userIds = [callerId];
      }
    }

    const type = String(payload.type ?? "system").slice(0, 50);
    const link = payload.link ? String(payload.link).slice(0, 500) : null;
    const data = (payload.data && typeof payload.data === "object" ? payload.data : {}) as Record<string, unknown>;

    const rows = userIds.map((uid) => ({
      recipient_id: uid,
      user_id: uid,
      title,
      message,
      media_url: typeof data.media_url === "string" ? data.media_url : null,
      media_type: typeof data.media_type === "string" ? data.media_type : null,
      type,
      link,
      data,
      is_read: false,
    }));

    const { data: inserted, error: insertErr } = await admin
      .from("notifications")
      .insert(rows)
      .select("id");

    if (insertErr) {
      console.error("notification insert failed", insertErr.message);
      return json({ error: insertErr.message }, 500);
    }

    // Push failures never fail the in-app notification.
    let push: Record<string, unknown> = { sent: false, reason: "disabled" };
    if (payload.push !== false) {
      push = await sendPush(admin, userIds, title, message, link, { ...data, type, link });
    }

    return json({ success: true, created: inserted?.length ?? 0, push });
  } catch (e) {
    console.error("send-notification failed", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
