import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-dimes-auth-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const INTERNAL_SECRET = Deno.env.get("NOTIFY_INTERNAL_SECRET") ?? "";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const body = await req.json().catch(() => ({}));

    const senderId = String(body.sender_id ?? "").trim();
    const recipientId = String(body.recipient_id ?? "").trim();
    const preview = String(body.preview ?? "").trim().slice(0, 140);

    if (!senderId || !recipientId) return json({ error: "sender_id and recipient_id are required" }, 400);
    if (senderId === recipientId) return json({ success: true, skipped: "self" });

    // Verify the caller really is the sender (Supabase JWT).
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    let callerId = "";
    if (token && token !== SUPABASE_ANON_KEY) {
      const { data } = await admin.auth.getUser(token);
      callerId = data?.user?.id ?? "";
    }

    // Fall back to proving the message exists (custom-auth users have no JWT).
    if (callerId !== senderId) {
      const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: recent } = await admin
        .from("direct_messages")
        .select("id")
        .eq("sender_id", senderId)
        .eq("recipient_id", recipientId)
        .gte("created_at", since)
        .limit(1);
      if (!recent || recent.length === 0) return json({ error: "Unauthorized" }, 401);
    }

    const { data: sender } = await admin
      .from("users")
      .select("id, username, profile_photo, front_page_photo")
      .eq("id", senderId)
      .maybeSingle();

    const handle = `@${sender?.username ?? "member"}`;
    const photo = sender?.profile_photo || sender?.front_page_photo || null;

    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": INTERNAL_SECRET,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        user_id: recipientId,
        title: "New Message",
        message: preview ? `From ${handle}: ${preview}` : `From ${handle}`,
        type: "message",
        link: `/dashboard/messages?dm=${senderId}`,
        data: {
          actor_user_id: senderId,
          actor_username: sender?.username ?? null,
          actor_photo_url: photo,
          notification_icon: photo,
        },
        push: true,
      }),
    });

    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("send-notification failed", res.status, JSON.stringify(result));
      return json({ error: "notification_failed" }, 500);
    }

    return json({ success: true, result });
  } catch (e) {
    console.error("notify-direct-message failed", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
