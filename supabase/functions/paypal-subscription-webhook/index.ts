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

// Map a PayPal plan_id to our tier/cadence/billing_option based on env vars
function mapPlanToTierCadence(planId: string | undefined): { tier?: string; cadence?: string; billing_option?: string } {
  if (!planId) return {};
  const env = (name: string) => Deno.env.get(name) || undefined;
  const maps: Array<{ id?: string; tier: string; cadence: string; billing_option?: string }> = [
    { id: env("PAYPAL_SILVER_MONTHLY_PLAN_ID") || env("SILVER_MONTHLY_PLAN_ID"), tier: "silver", cadence: "monthly" },
    { id: env("PAYPAL_SILVER_YEARLY_PLAN_ID") || env("SILVER_YEARLY_PLAN_ID"), tier: "silver", cadence: "yearly" },
    { id: env("PAYPAL_GOLD_MONTHLY_PLAN_ID") || env("GOLD_MONTHLY_PLAN_ID"), tier: "gold", cadence: "monthly" },
    { id: env("PAYPAL_GOLD_YEARLY_PLAN_ID") || env("GOLD_YEARLY_PLAN_ID"), tier: "gold", cadence: "yearly" },
    { id: env("PAYPAL_DIAMOND_MONTHLY_PLAN_ID") || env("DIAMOND_MONTHLY_PLAN_ID"), tier: "diamond", cadence: "monthly" },
    { id: env("PAYPAL_DIAMOND_YEARLY_FULL_PLAN_ID") || env("DIAMOND_YEARLY_FULL_PLAN_ID"), tier: "diamond", cadence: "yearly", billing_option: "full" },
    { id: env("PAYPAL_DIAMOND_YEARLY_SPLIT_PLAN_ID") || env("DIAMOND_YEARLY_SPLIT_PLAN_ID"), tier: "diamond", cadence: "yearly", billing_option: "split" },
    { id: env("PAYPAL_ELITE_MONTHLY_PLAN_ID") || env("ELITE_MONTHLY_PLAN_ID"), tier: "elite", cadence: "monthly" },
  ];
  const found = maps.find((m) => m.id === planId);
  if (!found) return {};
  return { tier: found.tier, cadence: found.cadence, billing_option: found.billing_option };
}

async function fetchSubscriptionDetails(subId: string): Promise<{ plan_id?: string; custom_id?: string } | null> {
  try {
    const token = await getPayPalAccessToken();
    const base = getPayPalBaseUrl();
    const r = await fetch(`${base}/v1/billing/subscriptions/${subId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (!r.ok) return null;
    const j = await r.json();
    return { plan_id: j?.plan_id, custom_id: j?.custom_id };
  } catch (_) {
    return null;
  }
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
    const parsed: any = parseCustomId(customId);

    // Handle important events
    switch (evt) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
      case "BILLING.SUBSCRIPTION.CREATED": {
        if (!subscriptionId) break;
        // Resolve tier/cadence/user_id as robustly as possible
        let tier: string = (parsed?.tier as string) || "";
        let cadence: string = (parsed?.cadence as string) || "";
        let billing_option: string | undefined = (parsed?.billing_option as string | undefined);
        let user_id: string | undefined = (parsed?.user_id as string | undefined);

        let planIdFromEvent: string | undefined = res.plan_id;
        if ((!tier || !cadence) && planIdFromEvent) {
          const mapped = mapPlanToTierCadence(planIdFromEvent);
          tier = tier || mapped.tier || "";
          cadence = cadence || mapped.cadence || "";
          billing_option = billing_option || mapped.billing_option;
        }

        if ((!user_id || !tier || !cadence) && subscriptionId) {
          const details: any = await fetchSubscriptionDetails(subscriptionId);
          if (details) {
            if (!planIdFromEvent && details.plan_id) {
              const mapped = mapPlanToTierCadence(details.plan_id);
              tier = tier || mapped.tier || "";
              cadence = cadence || mapped.cadence || "";
              billing_option = billing_option || mapped.billing_option;
            }
            if (!user_id && details.custom_id) {
              const p: any = parseCustomId(details.custom_id);
              user_id = p.user_id || user_id;
              tier = tier || p.tier || tier;
              cadence = cadence || p.cadence || cadence;
              billing_option = billing_option || p.billing_option || billing_option;
            }
          }
        }

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

        // If ACTIVATED event includes a last_payment, treat this as an initial successful payment
        // Some Sandbox accounts emit ACTIVATED with billing_info.last_payment but do not emit PAYMENT.SUCCEEDED
        try {
          const hasInitialPayment = !!(billingInfo && billingInfo.last_payment);
          if (hasInitialPayment) {
            // Load subscription row
            const { data: sub, error: subErr } = await supabase
              .from("subscriptions")
              .select("*")
              .eq("subscription_id", subscriptionId)
              .single();

            if (!sub || subErr) {
              console.error("Subscription not found to update initial payment (ACTIVATED):", subErr);
              break;
            }

            // Backfill tier/cadence/user_id if missing
            let subTier = (sub as any).tier as string | null;
            let subCadence = (sub as any).cadence as string | null;
            let subBillingOption = (sub as any).billing_option as string | null;
            let subUserId = (sub as any).user_id as string | null;
            if (!subTier || !subCadence || !subUserId) {
              const details: any = await fetchSubscriptionDetails(subscriptionId);
              if (details) {
                const mapped = mapPlanToTierCadence(details.plan_id);
                const p: any = parseCustomId(details.custom_id);
                subTier = subTier || p.tier || mapped.tier || subTier;
                subCadence = subCadence || p.cadence || mapped.cadence || subCadence;
                subBillingOption = subBillingOption || p.billing_option || mapped.billing_option || subBillingOption;
                subUserId = subUserId || p.user_id || subUserId;
              }
              if (subTier || subCadence || subBillingOption || subUserId) {
                await supabase
                  .from("subscriptions")
                  .update({
                    tier: subTier || sub.tier,
                    cadence: subCadence || sub.cadence,
                    billing_option: subBillingOption || sub.billing_option,
                    user_id: subUserId || sub.user_id,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", sub.id);
              }
            }

            // Compute cycles and expiration like PAYMENT.SUCCEEDED
            let newCycles = (sub.cycles_paid || 0) + 1;
            let newExpiresAt: string | null = sub.membership_expires_at;
            const now = new Date();
            const tierToUse = (subTier || sub.tier);
            const cadenceToUse = (subCadence || sub.cadence);
            const billingToUse = (subBillingOption || sub.billing_option);

            if (tierToUse === "diamond" && cadenceToUse === "yearly" && billingToUse === "split") {
              const base = sub.membership_expires_at ? new Date(sub.membership_expires_at) : now;
              const extended = addMonths(base > now ? base : now, 4);
              newExpiresAt = extended.toISOString();
            } else if (cadenceToUse === "monthly") {
              const base = sub.membership_expires_at ? new Date(sub.membership_expires_at) : now;
              const extended = addMonths(base > now ? base : now, 1);
              newExpiresAt = extended.toISOString();
            } else if (cadenceToUse === "yearly") {
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
              console.error("Failed to update cycles_paid for subscription (ACTIVATED):", updErr);
            }

            // Update user membership immediately
            const effectiveUserId = subUserId || sub.user_id;
            const effectiveTier = subTier || sub.tier;
            if (effectiveUserId && effectiveTier) {
              const userUpdate: any = { membership_tier: effectiveTier, updated_at: new Date().toISOString() };
              const { error: userErr } = await supabase
                .from("users")
                .update(userUpdate)
                .eq("id", effectiveUserId);
              if (userErr) console.error("Failed to update user membership tier (ACTIVATED):", userErr);
            }
          }
        } catch (e) {
          console.error("ACTIVATED initial payment handling error:", e);
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

        // Backfill missing tier/cadence/user_id if needed (ensures user membership update works)
        let subTier = (sub as any).tier as string | null;
        let subCadence = (sub as any).cadence as string | null;
        let subBillingOption = (sub as any).billing_option as string | null;
        let subUserId = (sub as any).user_id as string | null;
        if (!subTier || !subCadence || !subUserId) {
          const details: any = await fetchSubscriptionDetails(subscriptionId);
          if (details) {
            const mapped = mapPlanToTierCadence(details.plan_id);
            const p: any = parseCustomId(details.custom_id);
            subTier = subTier || p.tier || mapped.tier || subTier;
            subCadence = subCadence || p.cadence || mapped.cadence || subCadence;
            subBillingOption = subBillingOption || p.billing_option || mapped.billing_option || subBillingOption;
            subUserId = subUserId || p.user_id || subUserId;
          }
          // Persist backfill if we resolved anything
          if (subTier || subCadence || subBillingOption || subUserId) {
            await supabase
              .from("subscriptions")
              .update({
                tier: subTier || sub.tier,
                cadence: subCadence || sub.cadence,
                billing_option: subBillingOption || sub.billing_option,
                user_id: subUserId || sub.user_id,
                updated_at: new Date().toISOString(),
              })
              .eq("id", sub.id);
          }
        }

        // Determine increment and membership extension rules
        let newCycles = (sub.cycles_paid || 0) + 1;
        let newExpiresAt: string | null = sub.membership_expires_at;
        const now = new Date();

        const tierToUse = (subTier || sub.tier);
        const cadenceToUse = (subCadence || sub.cadence);
        const billingToUse = (subBillingOption || sub.billing_option);

        if (tierToUse === "diamond" && cadenceToUse === "yearly" && billingToUse === "split") {
          // Each successful split cycle extends membership by 4 months
          const base = sub.membership_expires_at ? new Date(sub.membership_expires_at) : now;
          const extended = addMonths(base > now ? base : now, 4);
          newExpiresAt = extended.toISOString();
        } else if (cadenceToUse === "monthly") {
          const base = sub.membership_expires_at ? new Date(sub.membership_expires_at) : now;
          const extended = addMonths(base > now ? base : now, 1);
          newExpiresAt = extended.toISOString();
        } else if (cadenceToUse === "yearly") {
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

        // Elite specific handling for monthly cadence
        try {
          if ((tierToUse || parsed.tier) === "elite" && (cadenceToUse || parsed.cadence) === "monthly") {
            const userId = subUserId || sub.user_id || parsed.user_id;
            if (userId) {
              // Fetch current elite membership (active/lifetime)
              const { data: eliteActive, error: eliteErr } = await supabase
                .from("elite_memberships")
                .select("id, status, months_paid_count, seat_number")
                .eq("user_id", userId)
                .in("status", ["monthly_active", "lifetime"]) as any;

              if (eliteErr) {
                console.error("elite_memberships fetch error:", eliteErr);
              }

              if (!eliteActive || eliteActive.length === 0) {
                // New monthly start: ensure seats available (<50)
                const { data: seatStats } = await supabase
                  .from("elite_seat_stats")
                  .select("seats_available, seats_taken")
                  .single();

                if (!seatStats || seatStats.seats_available <= 0) {
                  console.warn("Elite seats are full. Not assigning seat.");
                } else {
                  // Find smallest available seat_number 1..50
                  const { data: currentSeats } = await supabase
                    .from("elite_memberships")
                    .select("seat_number")
                    .in("status", ["monthly_active", "lifetime"]); 

                  const taken = new Set<number>((currentSeats || []).map((r: any) => r.seat_number).filter((n: number) => !!n));
                  let seat = 1;
                  while (seat <= 50 && taken.has(seat)) seat++;
                  if (seat > 50) {
                    console.warn("No free seat found despite availability count");
                  } else {
                    const { error: insErr } = await supabase
                      .from("elite_memberships")
                      .insert({
                        user_id: userId,
                        status: "monthly_active",
                        months_paid_count: 1,
                        last_payment_at: new Date().toISOString(),
                        seat_number: seat,
                      });
                    if (insErr) console.error("elite_memberships insert error:", insErr);
                  }
                }
              } else {
                const membership = eliteActive[0];
                const months = (membership.months_paid_count || 0) + 1;
                const updates: any = { months_paid_count: months, last_payment_at: new Date().toISOString() };
                let grantLifetime = false;
                if (months >= 12 && membership.status !== "lifetime") {
                  updates.status = "lifetime";
                  updates.lifetime_granted_at = new Date().toISOString();
                  grantLifetime = true;
                }
                const { error: updEliteErr } = await supabase
                  .from("elite_memberships")
                  .update(updates)
                  .eq("id", membership.id);
                if (updEliteErr) console.error("elite_memberships update error:", updEliteErr);

                // If granted lifetime at 12, optionally cancel PayPal subscription to stop future charges
                if (grantLifetime) {
                  try {
                    const token = await getPayPalAccessToken();
                    const base = getPayPalBaseUrl();
                    await fetch(`${base}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
                      method: "POST",
                      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                      body: JSON.stringify({ reason: "Lifetime granted after 12 payments" }),
                    });
                    console.log("Cancelled PayPal subscription after lifetime grant:", subscriptionId);
                  } catch (e) {
                    console.error("Failed to cancel PayPal subscription after lifetime:", e);
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error("Elite monthly handling error:", e);
        }

        // Optional: also reflect membership status in users table
        const effectiveUserId = subUserId || sub.user_id;
        const effectiveTier = subTier || sub.tier;
        if (effectiveUserId && effectiveTier) {
          const userUpdate: any = { membership_tier: effectiveTier, updated_at: new Date().toISOString() };
          // If you want to set boolean flags, handle per tier here
          const { error: userErr } = await supabase
            .from("users")
            .update(userUpdate)
            .eq("id", effectiveUserId);
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

        // Elite monthly: on cancel/suspend/expire before lifetime, free the seat and reset
        try {
          // Load subscription to identify user and tier
          const { data: sub } = await supabase
            .from("subscriptions")
            .select("user_id, tier, cadence")
            .eq("subscription_id", subscriptionId)
            .single();
          if (sub && sub.user_id && sub.tier === "elite" && sub.cadence === "monthly") {
            const { data: eliteActive } = await supabase
              .from("elite_memberships")
              .select("id, status, months_paid_count")
              .eq("user_id", sub.user_id)
              .in("status", ["monthly_active", "lifetime"]) as any;
            if (eliteActive && eliteActive.length > 0) {
              const m = eliteActive[0];
              if (m.status === "monthly_active" && (m.months_paid_count || 0) < 12) {
                const { error: updElite } = await supabase
                  .from("elite_memberships")
                  .update({ status: "canceled", seat_number: null })
                  .eq("id", m.id);
                if (updElite) console.error("Failed to cancel/free elite seat:", updElite);
              }
            }
          }
        } catch (e) {
          console.error("Elite cancel handling error:", e);
        }
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
