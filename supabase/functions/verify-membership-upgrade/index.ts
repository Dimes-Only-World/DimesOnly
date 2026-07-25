import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));
    const { upgrade_id, token } = body as { upgrade_id?: string; token?: string };

    if (!upgrade_id && !token) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing upgrade_id or token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Look up upgrade by id, then by paypal_order_id
    let upgrade: any = null;
    if (upgrade_id) {
      const { data } = await supabase
        .from("membership_upgrades")
        .select("*")
        .eq("id", upgrade_id)
        .maybeSingle();
      upgrade = data;
    }
    if (!upgrade && token) {
      const { data } = await supabase
        .from("membership_upgrades")
        .select("*")
        .eq("paypal_order_id", token)
        .maybeSingle();
      upgrade = data;
    }

    if (!upgrade) {
      return new Response(
        JSON.stringify({ success: false, error: "Upgrade not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // If still pending, trigger activation via membership-webhook
    if (upgrade.upgrade_status !== "completed" && upgrade.payment_status !== "partially_paid") {
      const orderId = upgrade.paypal_order_id || token;
      if (orderId) {
        try {
          await supabase.functions.invoke("membership-webhook", {
            body: {
              event_type: "CHECKOUT.ORDER.APPROVED",
              resource: { id: orderId },
            },
          });
        } catch (e) {
          console.error("membership-webhook invoke failed:", e);
        }

        // Re-fetch after activation attempt
        const { data: refreshed } = await supabase
          .from("membership_upgrades")
          .select("*")
          .eq("id", upgrade.id)
          .maybeSingle();
        if (refreshed) upgrade = refreshed;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        upgrade_id: upgrade.id,
        tier: upgrade.upgrade_type,
        upgrade_status: upgrade.upgrade_status,
        payment_status: upgrade.payment_status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("verify-membership-upgrade error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Verification failed",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
