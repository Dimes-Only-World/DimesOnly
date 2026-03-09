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

      // Insert notification
      const preview = trimmedMessage.substring(0, 50) + (trimmedMessage.length > 50 ? "..." : "");
      const { error: notifErr } = await supabase.from("notifications").insert({
        recipient_id: recipientId,
        title: "New Message from Admin",
        message: `You have received a new message from the admin: "${preview}"`,
        is_read: false,
        created_at: new Date().toISOString(),
      });

      if (notifErr) {
        console.error(`Failed to send notification to ${recipientId}:`, notifErr);
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
