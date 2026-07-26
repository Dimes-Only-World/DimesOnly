import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID") ?? "";
const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY") ?? "";
const INTERNAL_SECRET = Deno.env.get("NOTIFY_INTERNAL_SECRET") ?? "";

const SITE_URL = "https://dimesonly.world";

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

  try {
    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_player_ids: playerIds,
        headings: { en: title },
        contents: { en: message },
        url: link ? `${SITE_URL}${link.startsWith("/") ? link : `/${link}`}` : SITE_URL,
        // Brand logo on the lock screen / notification shade.
        chrome_web_icon: `${SITE_URL}/notification-icon.png`,
        chrome_web_badge: `${SITE_URL}/notification-icon.png`,
        firefox_icon: `${SITE_URL}/notification-icon.png`,
        large_icon: `${SITE_URL}/notification-icon.png`,
        data,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("OneSignal error", res.status, JSON.stringify(body));
      return { sent: false, reason: `onesignal_${res.status}` };
    }
    return { sent: true, recipients: playerIds.length, onesignal_id: body?.id ?? null };
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
    const isInternal = INTERNAL_SECRET.length > 0 && internalKey === INTERNAL_SECRET;

    let userIds = requested;

    if (!isInternal) {
      const authHeader = req.headers.get("Authorization") ?? "";
      const token = authHeader.replace(/^Bearer\s+/i, "");
      if (!token) return json({ error: "Unauthorized" }, 401);

      const { data: userRes, error: userErr } = await admin.auth.getUser(token);
      const caller = userRes?.user;
      if (userErr || !caller) return json({ error: "Unauthorized" }, 401);

      const { data: isAdmin } = await admin.rpc("check_admin_by_user_id", { _user_id: caller.id });

      if (!isAdmin) {
        const others = requested.filter((id) => id !== caller.id);
        if (others.length > 0) return json({ error: "Forbidden" }, 403);
        userIds = [caller.id];
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
