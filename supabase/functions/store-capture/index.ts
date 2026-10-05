import { getCallerId, AUTH_HEADERS } from "../_shared/caller.ts";
import { fulfillStoreOrder } from "../_shared/storeFulfill.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": AUTH_HEADERS,
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });


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
    if (order.user_id) {
      const _caller = await getCallerId(req);
      if (_caller !== order.user_id) return json({ success: false, error: "Please sign in again to continue." }, 401);
    }

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

    const res = await fulfillStoreOrder(supabase, order);
    if (res.already_processed) return json({ success: true, order_id: order.id, already_processed: true });

    return json({ success: true, order_id: order.id });
  } catch (e) {
    console.error("store-capture error", e);
    return json({ success: false, error: (e as Error).message }, 500);
  }
});
