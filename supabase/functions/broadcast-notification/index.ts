import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const INTERNAL_SECRET = Deno.env.get("NOTIFY_INTERNAL_SECRET") ?? "";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const chunk = <T,>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json({ error: "Server not configured" }, 500);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const body = await req.json().catch(() => ({}));
    const adminUserId = String(body.adminUserId ?? "").trim();
    const message = String(body.message ?? "").trim();
    const mediaUrl = body.mediaUrl ? String(body.mediaUrl).trim() : null;
    const mediaType = body.mediaType ? String(body.mediaType).trim() : null;

    if (!adminUserId) return json({ error: "Admin user ID required" }, 401);
    if (!message || message.length > 500) return json({ error: "Message is required (max 500 chars)" }, 400);

    const { data: isAdmin, error: adminError } = await admin.rpc("check_admin_by_user_id", { _user_id: adminUserId });
    if (adminError || !isAdmin) return json({ error: "Admin access required" }, 403);

    const { data: users, error: usersError } = await admin
      .from("users")
      .select("id")
      .eq("is_active", true)
      .limit(10000);

    if (usersError) return json({ error: usersError.message }, 500);
    const userIds = (users ?? []).map((user: { id: string }) => user.id).filter(Boolean);
    if (userIds.length === 0) return json({ error: "No active users found" }, 404);

    let created = 0;
    let pushRecipients = 0;
    const pushResults: unknown[] = [];

    for (const batch of chunk(userIds, 500)) {
      const notifyRes = await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": INTERNAL_SECRET,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          user_ids: batch,
          title: "Admin Notification",
          message,
          type: "admin",
          link: "/dashboard?tab=notifications",
          data: {
            media_url: mediaUrl,
            media_type: mediaType,
            notification_icon: mediaType === "photo" ? mediaUrl : undefined,
            image_url: mediaType === "photo" ? mediaUrl : undefined,
          },
          push: true,
        }),
      });

      const result = await notifyRes.json().catch(() => ({}));
      pushResults.push(result);

      if (!notifyRes.ok) {
        console.error("send-notification broadcast batch failed", notifyRes.status, JSON.stringify(result));
        continue;
      }

      created += Number(result?.created ?? batch.length) || 0;
      pushRecipients += Number(result?.push?.recipients ?? 0) || 0;
    }

    return json({
      success: true,
      totalUsers: userIds.length,
      created,
      pushRecipients,
      pushResults,
    });
  } catch (e) {
    console.error("broadcast-notification failed", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});