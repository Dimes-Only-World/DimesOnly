import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type VerifyBody = {
  subscription_id?: string;
  tier?: string;
  cadence?: string;
  billing_option?: string;
  user_id?: string;
};

const allowedTiers = new Set(["silver", "gold", "diamond", "elite"]);
const allowedCadences = new Set(["monthly", "yearly"]);

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function getPayPalBaseUrl() {
  const env = (Deno.env.get("PAYPAL_ENVIRONMENT") || "sandbox").toLowerCase();
  return env === "production" || env === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

function parseCustomId(customId: string | undefined) {
  const result: { tier?: string; cadence?: string; billing_option?: string; user_id?: string } = {};
  if (!customId) return result;
  const [left, userPart] = customId.split("_user_");
  if (userPart) result.user_id = userPart;
  const parts = left.split("_");
  result.tier = parts[0];
  result.cadence = parts[1];
  result.billing_option = parts[2];
  return result;
}

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

async function getPayPalAccessToken() {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Missing PayPal credentials");

  const tokenResponse = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`PayPal credential check failed: ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token as string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  try {
    const body = (await req.json().catch(() => ({}))) as VerifyBody;
    const subscriptionId = String(body.subscription_id || "").trim();
    if (!subscriptionId || !subscriptionId.startsWith("I-")) {
      return json({ success: false, error: "Missing or invalid subscription_id" }, 400);
    }

    const accessToken = await getPayPalAccessToken();
    const detailsResponse = await fetch(`${getPayPalBaseUrl()}/v1/billing/subscriptions/${subscriptionId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!detailsResponse.ok) {
      const errorText = await detailsResponse.text();
      return json({ success: false, error: `PayPal subscription lookup failed: ${errorText}` }, 409);
    }

    const details = await detailsResponse.json();
    const paypalStatus = String(details?.status || "").toUpperCase();
    if (!["ACTIVE", "APPROVAL_PENDING"].includes(paypalStatus)) {
      return json({ success: false, error: `Subscription is not active yet. PayPal status: ${paypalStatus || "unknown"}` }, 409);
    }

    const custom = parseCustomId(details?.custom_id);
    const tier = String(body.tier || custom.tier || "").toLowerCase();
    const cadence = String(body.cadence || custom.cadence || "monthly").toLowerCase();
    const billingOption = body.billing_option || custom.billing_option || null;
    const userId = String(body.user_id || custom.user_id || "").trim();

    if (!allowedTiers.has(tier)) return json({ success: false, error: "Invalid membership tier" }, 400);
    if (!allowedCadences.has(cadence)) return json({ success: false, error: "Invalid billing cadence" }, 400);
    if (!userId) return json({ success: false, error: "Missing user_id for subscription" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase service credentials");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const billingInfo = details?.billing_info || {};
    const nextBillingTime = billingInfo?.next_billing_time ? new Date(billingInfo.next_billing_time).toISOString() : null;
    const now = new Date();
    const expiresAt = cadence === "yearly" ? addMonths(now, 12).toISOString() : addMonths(now, 1).toISOString();

    const { data: sub, error: subError } = await supabase
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          subscription_id: subscriptionId,
          tier,
          cadence,
          billing_option: billingOption,
          total_cycles: tier === "diamond" && cadence === "yearly" && billingOption === "split" ? 3 : null,
          status: paypalStatus === "ACTIVE" ? "active" : "approval_pending",
          next_billing_time: nextBillingTime,
          membership_expires_at: paypalStatus === "ACTIVE" ? expiresAt : null,
          cycles_paid: paypalStatus === "ACTIVE" ? 1 : 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "subscription_id" },
      )
      .select()
      .single();

    if (subError) return json({ success: false, error: subError.message }, 500);

    if (paypalStatus === "ACTIVE") {
      const { error: userError } = await supabase
        .from("users")
        .update({ membership_tier: tier, updated_at: new Date().toISOString() })
        .eq("id", userId);
      if (userError) return json({ success: false, error: userError.message }, 500);
    }

    return json({
      success: true,
      subscription_id: subscriptionId,
      tier,
      cadence,
      subscription_status: sub?.status || (paypalStatus === "ACTIVE" ? "active" : "approval_pending"),
      paypal_status: paypalStatus,
    });
  } catch (error) {
    console.error("verify-paypal-subscription error:", error);
    return json({ success: false, error: error instanceof Error ? error.message : "Subscription verification failed" }, 500);
  }
});