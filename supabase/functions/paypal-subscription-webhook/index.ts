import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type PayPalEvent = {
  id: string;
  event_type: string;
  resource?: any;
};

type ParsedCustomId = {
  tier: string;
  cadence: string;
  billing_option?: string;
  user_id?: string;
};

function parseCustomId(customId: string | undefined): ParsedCustomId {
  // Expected pattern: `${tier}_${cadence}${opt}_user_${user_id}` where opt could be `_full` or `_split`
  const result: ParsedCustomId = { tier: "", cadence: "" };
  if (!customId) return result;
  try {
    // Split by _user_ first to get user ID if present
    const [left, userPart] = customId.split("_user_");
    if (userPart) result.user_id = userPart;
    const parts = left.split("_"); // e.g., [diamond, yearly, split]
    result.tier = parts[0] || "";
    result.cadence = parts[1] || "";
    result.billing_option = parts[2] || undefined;
  } catch (_) {}
  return result;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

// --- PayPal verification helpers ---
function getPayPalBaseUrl() {
  const env = (Deno.env.get("PAYPAL_ENVIRONMENT") || "sandbox").toLowerCase();
  return env === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Missing PayPal client credentials");
  const base = getPayPalBaseUrl();
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": "Basic " + btoa(`${clientId}:${clientSecret}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal token error: ${res.status}`);
  const data = await res.json();
  return data.access_token as string;
}

async function verifyPayPalWebhook(headers: Headers, rawBody: string): Promise<boolean> {
  const webhookId = Deno.env.get("PAYPAL_WEBHOOK_ID");
  if (!webhookId) {
    console.warn("PAYPAL_WEBHOOK_ID missing; skipping verification (treating as VERIFIED in non-prod)");
    const env = (Deno.env.get("PAYPAL_ENVIRONMENT") || "sandbox").toLowerCase();
    // In live without WEBHOOK_ID, fail closed
    if (env === "live") return false;
    return true;
  }

  const authAlgo = headers.get("paypal-auth-algo") || headers.get("PayPal-Auth-Algo") || "";
  const certUrl = headers.get("paypal-cert-url") || headers.get("PayPal-Cert-Url") || "";
  const transmissionId = headers.get("paypal-transmission-id") || headers.get("PayPal-Transmission-Id") || "";
  const transmissionSig = headers.get("paypal-transmission-sig") || headers.get("PayPal-Transmission-Sig") || "";
  const transmissionTime = headers.get("paypal-transmission-time") || headers.get("PayPal-Transmission-Time") || "";

  if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
    console.error("Missing PayPal verification headers");
    return false;
  }

  const token = await getPayPalAccessToken();
  const base = getPayPalBaseUrl();

  const payload = {
    auth_algo: authAlgo,
    cert_url: certUrl,
    transmission_id: transmissionId,
    transmission_sig: transmissionSig,
    transmission_time: transmissionTime,
    webhook_id: webhookId,
    webhook_event: JSON.parse(rawBody),
  };

  const res = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error("verify-webhook-signature HTTP error", res.status);
    return false;
  }
  const data = await res.json();
  const status = (data.verification_status || "").toUpperCase();
  console.log("PayPal verification_status:", status);
  return status === "SUCCESS" || status === "VERIFIED";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    // Read raw body for signature verification
    const rawBody = await req.text();
    let payload: PayPalEvent;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    console.log("paypal-subscription-webhook payload:", JSON.stringify(payload, null, 2));

    // Verify PayPal webhook signature (fail closed in live)
    const verified = await verifyPayPalWebhook(req.headers, rawBody);
    if (!verified) {
      console.error("PayPal webhook signature verification failed");
      return new Response(JSON.stringify({ error: "signature_verification_failed" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase env" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const evt = payload.event_type;
    const res = payload.resource || {};
    const eventId = payload.id;

    // Idempotency: record event and skip duplicates
    if (eventId) {
      try {
        const { data: logData, error: logErr } = await supabase
          .from("paypal_webhook_events")
          .insert({ event_id: eventId, event_type: evt, payload: payload, processed_at: new Date().toISOString() })
          .select()
          .single();
        if (logErr) {
          // Unique violation => already processed
          // @ts-ignore code may exist on PostgrestError
          if (logErr.code === "23505") {
            console.log("Duplicate webhook event, skipping:", eventId);
            return new Response(JSON.stringify({ ok: true, duplicate: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          console.error("Failed to log webhook event:", logErr);
        } else {
          console.log("Logged webhook event:", logData?.id);
        }
      } catch (e) {
        console.error("Unexpected error logging webhook event:", e);
      }
    }

    // PayPal subscription id appears as resource.id or resource.subscription_id depending on event
    const subscriptionId: string | undefined = res.id || res.subscription_id || res.resource_id;

    // For some events, custom_id sits at resource.custom_id or resource.custom_id in the plan/links context
    const customId: string | undefined = res.custom_id || res.custom_id?.toString?.();

    // billing_info fields
    const billingInfo = res.billing_info || {};
    const nextBillingTimeStr: string | undefined = billingInfo.next_billing_time;
    const cyclesCompleted: number | undefined = billingInfo.cycle_executions?.reduce?.((acc: number, c: any) => acc + (parseInt(c.cycles_completed || "0") || 0), 0);

    // subscriber info (capture payer/user id if needed)
    const subscriber = res.subscriber;

    // Parse our custom id for mapping
    const parsed = parseCustomId(customId);

    // Handle important events
    switch (evt) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
      case "BILLING.SUBSCRIPTION.CREATED": {
        if (!subscriptionId) break;
        // Upsert subscriptions row
        const tier = parsed.tier || (res.plan_id ? "" : "");
        const cadence = parsed.cadence || "";
        const billing_option = parsed.billing_option;
        const user_id = parsed.user_id;

        // total cycles for diamond yearly split = 3 else null
        const total_cycles = tier === "diamond" && cadence === "yearly" && billing_option === "split" ? 3 : null;

        const { data: upsertData, error: upsertError } = await supabase
          .from("subscriptions")
          .upsert({
            user_id,
            subscription_id: subscriptionId,
            tier,
            cadence,
            billing_option,
            total_cycles,
            status: "active",
            next_billing_time: nextBillingTimeStr ? new Date(nextBillingTimeStr).toISOString() : null,
            updated_at: new Date().toISOString(),
          }, { onConflict: "subscription_id" })
          .select()
          .single();

        if (upsertError) {
          console.error("subscriptions upsert error:", upsertError);
        } else {
          console.log("subscriptions upsert ok:", upsertData?.id);
        }
        break;
      }
      case "BILLING.SUBSCRIPTION.PAYMENT.SUCCEEDED": {
        if (!subscriptionId) break;

        // Load subscription row
        const { data: sub, error: subErr } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("subscription_id", subscriptionId)
          .single();

        if (subErr || !sub) {
          console.error("Subscription not found to update payment:", subErr);
          break;
        }

        // Determine increment and membership extension rules
        let newCycles = (sub.cycles_paid || 0) + 1;
        let newExpiresAt: string | null = sub.membership_expires_at;
        const now = new Date();

        if (sub.tier === "diamond" && sub.cadence === "yearly" && sub.billing_option === "split") {
          // Each successful split cycle extends membership by 4 months
          const base = sub.membership_expires_at ? new Date(sub.membership_expires_at) : now;
          const extended = addMonths(base > now ? base : now, 4);
          newExpiresAt = extended.toISOString();
        } else if (sub.cadence === "monthly") {
          const base = sub.membership_expires_at ? new Date(sub.membership_expires_at) : now;
          const extended = addMonths(base > now ? base : now, 1);
          newExpiresAt = extended.toISOString();
        } else if (sub.cadence === "yearly") {
          const base = sub.membership_expires_at ? new Date(sub.membership_expires_at) : now;
          const extended = addMonths(base > now ? base : now, 12);
          newExpiresAt = extended.toISOString();
        }

        const nextBilling = nextBillingTimeStr ? new Date(nextBillingTimeStr).toISOString() : null;

        const { error: updErr } = await supabase
          .from("subscriptions")
          .update({
            cycles_paid: newCycles,
            next_billing_time: nextBilling,
            membership_expires_at: newExpiresAt,
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", sub.id);

        if (updErr) {
          console.error("Failed to update cycles_paid for subscription:", updErr);
        } else {
          console.log("Updated subscription cycles to", newCycles);
        }

        // Optional: also reflect membership status in users table
        if (sub.user_id && sub.tier) {
          const userUpdate: any = { membership_tier: sub.tier, updated_at: new Date().toISOString() };
          // If you want to set boolean flags, handle per tier here
          const { error: userErr } = await supabase
            .from("users")
            .update(userUpdate)
            .eq("id", sub.user_id);
          if (userErr) console.error("Failed to update user membership tier:", userErr);
        }
        break;
      }
      case "BILLING.SUBSCRIPTION.CANCELLED":
      case "BILLING.SUBSCRIPTION.SUSPENDED":
      case "BILLING.SUBSCRIPTION.EXPIRED": {
        if (!subscriptionId) break;
        const status = evt.endsWith("CANCELLED") ? "cancelled" : evt.endsWith("SUSPENDED") ? "suspended" : "expired";
        const { error: updErr } = await supabase
          .from("subscriptions")
          .update({ status, updated_at: new Date().toISOString() })
          .eq("subscription_id", subscriptionId);
        if (updErr) console.error("Failed to update subscription status:", updErr);
        break;
      }
      default: {
        console.log("Unhandled PayPal subscription event:", evt);
      }
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("paypal-subscription-webhook error:", e?.message, e?.stack);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
