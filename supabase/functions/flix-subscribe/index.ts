import { getCallerId, getVerifiedAdminId, AUTH_HEADERS } from "../_shared/caller.ts";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": AUTH_HEADERS, "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PLAN_CENTS: Record<string, number> = { monthly: 599, annual: 2999 };

const paypalBase = () =>
  (Deno.env.get("PAYPAL_ENVIRONMENT") || "sandbox") === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

const paypalToken = async () => {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("PayPal credentials missing");
  const res = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const body = await res.json();
  if (!res.ok) throw new Error("PayPal authentication failed");
  return body.access_token as string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const body = await req.json();
    const action = String(body.action || "createOrder");
    const userId = body.userId;
    if (!userId || typeof userId !== "string") return json({ error: "Missing userId" }, 400);
    { const _caller = await getCallerId(req); if (!_caller || _caller !== String(userId)) { if (!(await getVerifiedAdminId(req))) return json({ error: "Please sign in again to continue." }, 401); } }


    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userRow } = await supabase.from("users").select("id").eq("id", userId).maybeSingle();
    if (!userRow) return json({ error: "User not found" }, 404);

    const { data: existing } = await supabase
      .from("flix_subscriptions")
      .select("id, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (action === "createOrder") {
      if (existing) return json({ data: { alreadyActive: true } });

      const plan = body.plan;
      if (plan !== "monthly" && plan !== "annual") return json({ error: "Invalid plan" }, 400);
      const cents = PLAN_CENTS[plan];
      const returnUrl = String(body.returnUrl || "");
      const cancelUrl = String(body.cancelUrl || "");
      if (!returnUrl || !cancelUrl) return json({ error: "Missing return URLs" }, 400);

      const phone = typeof body.notifyPhone === "string" ? body.notifyPhone.trim().slice(0, 32) : "";

      const token = await paypalToken();
      const res = await fetch(`${paypalBase()}/v2/checkout/orders`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [
            {
              custom_id: `flix_${userId}_${plan}`,
              description: `FlameFlix ${plan === "annual" ? "Annual" : "Monthly"} Subscription`,
              amount: { currency_code: "USD", value: (cents / 100).toFixed(2) },
            },
          ],
          application_context: {
            brand_name: "FlameFlix",
            user_action: "PAY_NOW",
            shipping_preference: "NO_SHIPPING",
            return_url: returnUrl,
            cancel_url: cancelUrl,
          },
        }),
      });
      const orderJson = await res.json();
      if (!res.ok) return json({ error: "Could not start PayPal checkout" }, 400);

      const approve = (orderJson.links || []).find((l: any) => l.rel === "approve")?.href;
      if (!approve) return json({ error: "PayPal did not return a checkout link" }, 400);

      return json({ data: { paypal_order_id: orderJson.id, approve_url: approve, plan, amountCents: cents, notifyPhone: phone } });
    }

    if (action === "captureOrder") {
      const orderId = String(body.paypalOrderId || "");
      const plan = body.plan === "annual" ? "annual" : "monthly";
      if (!orderId) return json({ error: "Missing payment reference" }, 400);
      if (existing) return json({ data: { alreadyActive: true } });

      const { data: dupe } = await supabase
        .from("flix_subscriptions")
        .select("id")
        .eq("paypal_order_id", orderId)
        .maybeSingle();
      if (dupe) return json({ data: { alreadyActive: true, id: dupe.id } });

      const token = await paypalToken();
      const capRes = await fetch(`${paypalBase()}/v2/checkout/orders/${orderId}/capture`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const capJson = await capRes.json();
      const capture = capJson?.purchase_units?.[0]?.payments?.captures?.[0];
      const completed = capJson?.status === "COMPLETED" || capture?.status === "COMPLETED";
      if (!capRes.ok || !completed) return json({ error: "PayPal payment was not completed" }, 400);

      const paidCents = Math.round(Number(capture?.amount?.value || 0) * 100) || PLAN_CENTS[plan];
      const refCode = typeof body.referralCode === "string" && body.referralCode
        ? body.referralCode.toLowerCase()
        : null;
      const phone = typeof body.notifyPhone === "string" && body.notifyPhone.trim()
        ? body.notifyPhone.trim().slice(0, 32)
        : null;

      const { data, error } = await supabase
        .from("flix_subscriptions")
        .insert({
          user_id: userId,
          plan,
          status: "active",
          amount_cents: paidCents,
          referral_code: refCode,
          is_demo: false,
          paypal_order_id: orderId,
          paypal_capture_id: capture?.id || null,
          paid_at: new Date().toISOString(),
          notify_phone: phone,
          // Billing period starts when the member watches their first title.
          activated_at: null,
          current_period_end: null,
        })
        .select("id")
        .single();

      if (error) return json({ error: error.message }, 400);
      return json({ data });
    }

    if (action === "activate") {
      const { data: sub } = await supabase
        .from("flix_subscriptions")
        .select("id, plan, activated_at")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!sub) return json({ data: { activated: false } });
      if (sub.activated_at) return json({ data: { activated: true, alreadyActive: true } });

      const periodEnd = new Date();
      if (sub.plan === "annual") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      else periodEnd.setMonth(periodEnd.getMonth() + 1);

      await supabase
        .from("flix_subscriptions")
        .update({ activated_at: new Date().toISOString(), current_period_end: periodEnd.toISOString() })
        .eq("id", sub.id);

      return json({ data: { activated: true } });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
