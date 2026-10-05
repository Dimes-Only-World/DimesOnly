import { getCallerId, getVerifiedAdminId, AUTH_HEADERS } from "../_shared/caller.ts";
import { priceStoreOrder } from "../_shared/storeFulfill.ts";
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

    const body = await req.json();
    const items: Array<{ variant_id: string; qty: number }> = body.items || [];
    const email: string = (body.email || "").trim();
    const shippingMethod: string = body.shipping_method === "express" ? "express" : "standard";
    const discountCode: string | null = body.discount_code ? String(body.discount_code).trim().toUpperCase() : null;
    const shippingAddress = body.shipping_address || {};
    const userId: string | null = body.user_id || null;
    { const _caller = await getCallerId(req); if ((userId) && _caller !== String(userId)) { if (!(await getVerifiedAdminId(req))) return new Response(JSON.stringify({ success: false, error: "Please sign in again to continue." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }); } }

    const returnUrl: string = body.return_url;
    const cancelUrl: string = body.cancel_url;

    if (!items.length) return json({ success: false, error: "Cart is empty" }, 400);
    if (!email) return json({ success: false, error: "Email is required" }, 400);
    if (!returnUrl || !cancelUrl) return json({ success: false, error: "Missing return urls" }, 400);

    const priced = await priceStoreOrder(supabase, { items, shipping_method: shippingMethod, discount_code: discountCode });
    if ("error" in priced) return json({ success: false, error: priced.error }, 400);
    const { subtotal, shippingCents, discountCents, totalCents, appliedCode, orderItems } = priced;

    // PayPal token
    const authRes = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const authJson = await authRes.json();
    if (!authRes.ok) return json({ success: false, error: "PayPal auth failed", details: authJson }, 400);

    const orderRes = await fetch(`${base}/v2/checkout/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authJson.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          amount: { currency_code: "USD", value: (totalCents / 100).toFixed(2) },
          description: "Dimes Only Clothing order",
        }],
        application_context: {
          brand_name: "Dimes Only Clothing",
          user_action: "PAY_NOW",
          shipping_preference: "NO_SHIPPING",
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      }),
    });
    const orderJson = await orderRes.json();
    if (!orderRes.ok) return json({ success: false, error: "PayPal order failed", details: orderJson }, 400);

    const { data: order, error: oErr } = await supabase
      .from("store_orders")
      .insert({
        user_id: userId,
        email,
        status: "pending",
        subtotal_cents: subtotal,
        shipping_cents: shippingCents,
        discount_cents: discountCents,
        total_cents: totalCents,
        discount_code: appliedCode,
        paypal_order_id: orderJson.id,
        shipping_address: shippingAddress,
        shipping_method: shippingMethod,
      })
      .select("id")
      .single();
    if (oErr) throw oErr;

    const { error: iErr } = await supabase
      .from("store_order_items")
      .insert(orderItems.map((oi) => ({ ...oi, order_id: order.id })));
    if (iErr) throw iErr;

    const approve = (orderJson.links || []).find((l: any) => l.rel === "approve")?.href;
    return json({ success: true, order_id: order.id, paypal_order_id: orderJson.id, approve_url: approve });
  } catch (e) {
    console.error("store-checkout error", e);
    return json({ success: false, error: (e as Error).message }, 500);
  }
});
