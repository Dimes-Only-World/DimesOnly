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
    const returnUrl: string = body.return_url;
    const cancelUrl: string = body.cancel_url;

    if (!items.length) return json({ success: false, error: "Cart is empty" }, 400);
    if (!email) return json({ success: false, error: "Email is required" }, 400);
    if (!returnUrl || !cancelUrl) return json({ success: false, error: "Missing return urls" }, 400);

    // Server-side pricing
    const variantIds = items.map((i) => i.variant_id);
    const { data: variants, error: vErr } = await supabase
      .from("store_variants")
      .select("id, size, color, stock, product_id, store_products(id,name,price_cents,image_paths,published,archived)")
      .in("id", variantIds);
    if (vErr) throw vErr;

    let subtotal = 0;
    const orderItems: Record<string, unknown>[] = [];
    for (const item of items) {
      const qty = Math.max(1, Math.min(20, Number(item.qty) || 1));
      const v = (variants || []).find((x: any) => x.id === item.variant_id) as any;
      if (!v) return json({ success: false, error: "Item no longer available" }, 400);
      const p = v.store_products;
      if (!p || !p.published || p.archived) return json({ success: false, error: `${p?.name || "Item"} is unavailable` }, 400);
      if (v.stock < qty) return json({ success: false, error: `${p.name} (${v.size}/${v.color}) is out of stock` }, 400);
      subtotal += p.price_cents * qty;
      orderItems.push({
        product_id: p.id,
        variant_id: v.id,
        name: p.name,
        size: v.size,
        color: v.color,
        image_path: (p.image_paths || [])[0] || null,
        unit_price_cents: p.price_cents,
        qty,
      });
    }

    // Shipping
    const { data: shipSetting } = await supabase.from("store_settings").select("value").eq("key", "shipping").maybeSingle();
    const ship = (shipSetting?.value as any) || { standard_cents: 799, express_cents: 1499, free_threshold_cents: 15000 };
    let shippingCents = shippingMethod === "express" ? ship.express_cents : ship.standard_cents;
    if (shippingMethod === "standard" && subtotal >= ship.free_threshold_cents) shippingCents = 0;

    // Discount
    let discountCents = 0;
    let appliedCode: string | null = null;
    if (discountCode) {
      const { data: d } = await supabase.from("store_discounts").select("*").eq("code", discountCode).maybeSingle();
      const now = new Date();
      const valid =
        d && d.active &&
        subtotal >= (d.min_subtotal_cents || 0) &&
        (!d.starts_at || new Date(d.starts_at) <= now) &&
        (!d.ends_at || new Date(d.ends_at) >= now) &&
        (!d.max_uses || d.uses < d.max_uses);
      if (!valid) return json({ success: false, error: "Promo code is not valid for this order" }, 400);
      discountCents = d.type === "percent"
        ? Math.round(subtotal * (Number(d.value) / 100))
        : Math.round(Number(d.value) * 100);
      discountCents = Math.min(discountCents, subtotal);
      appliedCode = d.code;
    }

    const totalCents = Math.max(0, subtotal - discountCents) + shippingCents;

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
