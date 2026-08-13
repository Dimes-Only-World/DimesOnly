import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID") ?? "";
const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY") ?? "";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const { adminUserId, username, send } = await req.json().catch(() => ({}));

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: isAdmin } = await admin.rpc("check_admin_by_user_id", { _user_id: adminUserId });
  if (!isAdmin) return json({ error: "Unauthorized" }, 401);

  const { data: user } = await admin.from("users").select("id").eq("username", username).maybeSingle();
  if (!user) return json({ error: "user not found" }, 404);

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("player_id, updated_at")
    .eq("user_id", user.id);

  const players: unknown[] = [];
  for (const s of subs ?? []) {
    const res = await fetch(
      `https://onesignal.com/api/v1/players/${s.player_id}?app_id=${ONESIGNAL_APP_ID}`,
      { headers: { Authorization: `Basic ${ONESIGNAL_REST_API_KEY}` } },
    );
    const body = await res.json().catch(() => ({}));
    players.push({
      player_id: s.player_id,
      updated_at: s.updated_at,
      status: res.status,
      invalid_identifier: body?.invalid_identifier,
      device_type: body?.device_type,
      notification_types: body?.notification_types,
      last_active: body?.last_active,
      error: body?.errors,
    });
  }

  let sendResult: unknown = null;
  if (send) {
    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_subscription_ids: (subs ?? []).map((s) => s.player_id),
        headings: { en: "Dimes Only" },
        contents: { en: "Push test — notifications are working." },
        url: "https://dimesonly.world/dashboard/notifications",
      }),
    });
    sendResult = { status: res.status, body: await res.json().catch(() => ({})) };
  }

  return json({ user_id: user.id, players, sendResult });
});
