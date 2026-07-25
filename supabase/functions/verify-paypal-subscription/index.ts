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

// 20% direct + 10% upline commission for subscription first-payment.
// Net after PayPal fees ($0.50 flat + 2.75%). Idempotent per (referrer, type,
// referredUserId) using paypal_transaction_id column.
async function awardSubscriptionReferralOnce(
  supabase: any,
  referredUserId: string,
  grossAmount: number,
  subscriptionId: string,
) {
  try {
    if (!referredUserId || !grossAmount || grossAmount <= 0) return;
    const { data: payingUser } = await supabase
      .from("users")
      .select("id, username, referred_by")
      .eq("id", referredUserId)
      .single();
    if (!payingUser?.referred_by) return;
    const referrerUsername = String(payingUser.referred_by).trim();
    if (!referrerUsername || referrerUsername.toLowerCase() === "company") return;

    const { data: referrer } = await supabase
      .from("users")
      .select("id, username, referred_by")
      .ilike("username", referrerUsername)
      .maybeSingle();
    if (!referrer) return;

    const net = Math.max(0, Number(grossAmount) - (0.5 + Number(grossAmount) * 0.0275));
    const directAmt = Number((net * 0.20).toFixed(2));
    const uplineAmt = Number((net * 0.10).toFixed(2));

    // Week bounds (Mon-Sun) local
    const now = new Date();
    const dow = now.getDay();
    const daysToMonday = dow === 0 ? 6 : dow - 1;
    const wkStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday);
    const wkEnd = new Date(wkStart);
    wkEnd.setDate(wkStart.getDate() + 6);
    const ymd = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const wkStartStr = ymd(wkStart);
    const wkEndStr = ymd(wkEnd);

    const upsertWeekly = async (userId: string, amount: number) => {
      const { data: existing } = await supabase
        .from("weekly_earnings")
        .select("id, referral_earnings, amount")
        .eq("user_id", userId)
        .eq("week_start", wkStartStr)
        .maybeSingle();
      if (existing) {
        await supabase
          .from("weekly_earnings")
          .update({
            referral_earnings: Number(existing.referral_earnings || 0) + amount,
            amount: Number(existing.amount || 0) + amount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("weekly_earnings").insert({
          user_id: userId,
          week_start: wkStartStr,
          week_end: wkEndStr,
          amount,
          tip_earnings: 0,
          referral_earnings: amount,
          bonus_earnings: 0,
        });
      }
    };

    // Direct 20% — idempotent
    if (directAmt > 0) {
      const { data: existingDirect } = await supabase
        .from("payments")
        .select("id")
        .eq("user_id", referrer.id)
        .eq("payment_type", "subscription_referral_commission")
        .eq("paypal_transaction_id", referredUserId)
        .maybeSingle();
      if (!existingDirect) {
        const { error } = await supabase.from("payments").insert({
          user_id: referrer.id,
          amount: directAmt,
          payment_type: "subscription_referral_commission",
          payment_status: "completed",
          paypal_order_id: subscriptionId,
          paypal_transaction_id: referredUserId,
          referred_by: referrer.username,
          referrer_commission: directAmt,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        if (!error) await upsertWeekly(referrer.id, directAmt);
      }
    }

    // Upline 10% — idempotent
    const uplineUsername = String(referrer.referred_by || "").trim();
    if (uplineUsername && uplineUsername.toLowerCase() !== "company" && uplineAmt > 0) {
      const { data: upline } = await supabase
        .from("users")
        .select("id, username")
        .ilike("username", uplineUsername)
        .maybeSingle();
      if (upline?.id) {
        const { data: existingUpline } = await supabase
          .from("payments")
          .select("id")
          .eq("user_id", upline.id)
          .eq("payment_type", "subscription_upline_referral_commission")
          .eq("paypal_transaction_id", referredUserId)
          .maybeSingle();
        if (!existingUpline) {
          const { error } = await supabase.from("payments").insert({
            user_id: upline.id,
            amount: uplineAmt,
            payment_type: "subscription_upline_referral_commission",
            payment_status: "completed",
            paypal_order_id: subscriptionId,
            paypal_transaction_id: referredUserId,
            referred_by: upline.username,
            referrer_commission: uplineAmt,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          if (!error) await upsertWeekly(upline.id, uplineAmt);
        }
      }
    }
  } catch (e) {
    console.error("awardSubscriptionReferralOnce (verify) error:", e);
  }
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