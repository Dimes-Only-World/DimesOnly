import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { adminUserId, recipientIds, message } = await req.json();

    if (!adminUserId || !recipientIds?.length || !message?.trim()) {
      return new Response(
        JSON.stringify({ error: "Missing adminUserId, recipientIds, or message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const INTERNAL_SECRET = Deno.env.get("NOTIFY_INTERNAL_SECRET") ?? "";
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify admin status
    const { data: isAdmin, error: adminErr } = await supabase.rpc(
      "check_admin_by_user_id",
      { _user_id: adminUserId }
    );

    if (adminErr || !isAdmin) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: not an admin" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedMessage = message.trim();
    let successCount = 0;
    let failCount = 0;

    for (const recipientId of recipientIds) {
      // Insert direct message
      const { error: msgErr } = await supabase.from("direct_messages").insert({
        sender_id: adminUserId,
        recipient_id: recipientId,
        message: trimmedMessage,
        is_read: false,
        is_admin_message: true,
        created_at: new Date().toISOString(),
      });

      if (msgErr) {
        console.error(`Failed to send message to ${recipientId}:`, msgErr);
        failCount++;
        continue;
      }

      // In-app notification + lock-screen push (never fails the message send)
      const preview = trimmedMessage.substring(0, 80) + (trimmedMessage.length > 80 ? "..." : "");
      try {
        const notifyRes = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret": INTERNAL_SECRET,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            user_id: recipientId,
            title: "New Message from Admin",
            message: preview,
            type: "admin",
            link: "/dashboard?tab=messages",
            push: true,
          }),
        });
        if (!notifyRes.ok) {
          console.error("send-notification failed", notifyRes.status, await notifyRes.text());
          // Fallback so the bell still shows something.
          await supabase.from("notifications").insert({
            recipient_id: recipientId,
            user_id: recipientId,
            title: "New Message from Admin",
            message: preview,
            type: "admin",
            link: "/dashboard?tab=messages",
            is_read: false,
          });
        }
      } catch (e) {
        console.error(`Notification dispatch failed for ${recipientId}:`, e);
      }

      successCount++;
    }

    return new Response(
      JSON.stringify({ success: true, successCount, failCount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-admin-message error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
