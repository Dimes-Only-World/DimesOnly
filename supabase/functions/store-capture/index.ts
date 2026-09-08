import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const DIRECT_RATE = 0.10;
const UPLINE_RATE = 0.05;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    const env = Deno.env.get("PAYPAL_ENVIRONMENT") || "sandbox";
    if (!clientId || !clientSecret) return json({ success: false, error: "PayPal credentials missing" }, 400);
    const base = env === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { paypal_order_id } = await req.json();
    if (!paypal_order_id) return json({ success: false, error: "paypal_order_id required" }, 400);

    const { data: order, error: oErr } = await supabase
      .from("store_orders")
      .select("*")
      .eq("paypal_order_id", paypal_order_id)
      .maybeSingle();
    if (oErr) throw oErr;
    if (!order) return json({ success: false, error: "Order not found" }, 404);

    // Idempotent: already processed
    if (order.status !== "pending") {
      return json({ success: true, order_id: order.id, already_processed: true });
    }

    const authRes = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const authJson = await authRes.json();
    if (!authRes.ok) return json({ success: false, error: "PayPal auth failed" }, 400);

    const capRes = await fetch(`${base}/v2/checkout/orders/${paypal_order_id}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authJson.access_token}`, "Content-Type": "application/json" },
    });
    const capJson = await capRes.json();
    const alreadyCaptured = !capRes.ok &&
      JSON.stringify(capJson).includes("ORDER_ALREADY_CAPTURED");
    if (!capRes.ok && !alreadyCaptured) {
      return json({ success: false, error: "Payment could not be captured", details: capJson }, 400);
    }

    // Mark paid (guard against double processing)
    const { data: paidRows, error: uErr } = await supabase
      .from("store_orders")
      .update({ status: "paid" })
      .eq("id", order.id)
      .eq("status", "pending")
      .select("id");
    if (uErr) throw uErr;
    if (!paidRows || paidRows.length === 0) {
      return json({ success: true, order_id: order.id, already_processed: true });
    }

    // Decrement stock
    const { data: items } = await supabase
      .from("store_order_items")
      .select("variant_id, qty")
      .eq("order_id", order.id);
    for (const it of items || []) {
      if (!it.variant_id) continue;
      const { error } = await supabase.rpc("decrement_stock", { p_variant_id: it.variant_id, p_qty: it.qty });
      if (error) console.error("stock decrement failed", it.variant_id, error.message);
    }

    // Count discount use
    if (order.discount_code) {
      const { data: d } = await supabase.from("store_discounts").select("id,uses").eq("code", order.discount_code).maybeSingle();
      if (d) await supabase.from("store_discounts").update({ uses: (d.uses || 0) + 1 }).eq("id", d.id);
    }

    // Clear the buyer's cart
    if (order.user_id) {
      await supabase.from("store_cart_items").delete().eq("user_id", order.user_id);
    }

    // Commissions on the item subtotal (after discount)
    const commissionBase = Math.max(0, order.subtotal_cents - order.discount_cents) / 100;
    const payouts: Record<string, unknown>[] = [];
    if (order.user_id && commissionBase > 0) {
      const { data: buyer } = await supabase
        .from("users").select("id, referred_by").eq("id", order.user_id).maybeSingle();
      const directName = (buyer?.referred_by || "").trim();
      if (directName) {
        const { data: direct } = await supabase
          .from("users").select("id, referred_by").ilike("username", directName).maybeSingle();
        if (direct?.id) {
          payouts.push({
            user_id: direct.id,
            commission_type: "clothing_commission",
            amount: Number((commissionBase * DIRECT_RATE).toFixed(2)),
            payout_status: "pending",
          });
          const uplineName = (direct.referred_by || "").trim();
          if (uplineName) {
            const { data: upline } = await supabase
              .from("users").select("id").ilike("username", uplineName).maybeSingle();
            if (upline?.id) {
              payouts.push({
                user_id: upline.id,
                commission_type: "clothing_upline",
                amount: Number((commissionBase * UPLINE_RATE).toFixed(2)),
                payout_status: "pending",
              });
            }
          }
        }
      }
    }
    if (payouts.length) {
      const { error: cErr } = await supabase.from("commission_payouts").insert(payouts);
      if (cErr) console.error("commission insert failed", cErr.message);
    }

    return json({ success: true, order_id: order.id });
  } catch (e) {
    console.error("store-capture error", e);
    return json({ success: false, error: (e as Error).message }, 500);
  }
});
