import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Downgrades any user whose cancelled subscription has passed its
// membership_expires_at. Safe to run on any cadence (idempotent).
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const nowIso = new Date().toISOString();
    const { data: expired, error } = await admin
      .from("subscriptions")
      .select("id, user_id, tier, subscription_id")
      .eq("status", "cancelled")
      .lte("membership_expires_at", nowIso);

    if (error) throw error;

    let processed = 0;
    for (const sub of expired || []) {
      // Only downgrade if user is still on this paid tier (don't clobber a
      // lifetime tier they may have purchased in the meantime).
      const { data: user } = await admin
        .from("users")
        .select("id, membership_tier, silver_plus_active, diamond_plus_active, business_owner_elite_active")
        .eq("id", sub.user_id)
        .maybeSingle();

      if (user && String(user.membership_tier || "").toLowerCase() === String(sub.tier || "").toLowerCase()) {
        // Don't downgrade below Silver (default paid floor) and don't touch
        // users who hold a lifetime tier.
        const hasLifetime =
          Boolean(user.silver_plus_active) ||
          Boolean(user.diamond_plus_active) ||
          Boolean(user.business_owner_elite_active);
        if (!hasLifetime) {
          await admin
            .from("users")
            .update({
              membership_tier: "silver",
              membership_type: "Silver",
              updated_at: nowIso,
            })
            .eq("id", sub.user_id);
        }
      }

      await admin
        .from("subscriptions")
        .update({ status: "expired", updated_at: nowIso })
        .eq("id", sub.id);
      processed++;
    }

    return new Response(JSON.stringify({ success: true, processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("subscriptions-sweep error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "sweep failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
