import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
  console.log("=== PAYPAL WEBHOOK TRIGGERED ===");
  console.log("Request method:", req.method);
  console.log("Request URL:", req.url);
  console.log("User agent:", req.headers.get("user-agent"));

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("CORS preflight request handled");
    return new Response("ok", { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    console.log("Invalid method:", req.method);
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    console.log("=== WEBHOOK PROCESSING STARTED ===");

    // Read raw body for signature verification
    const rawBody = await req.text();
    
    // Verify PayPal webhook signature
    const verified = await verifyPayPalWebhook(req.headers, rawBody);
    if (!verified) {
      console.error("PayPal webhook signature verification failed");
      return new Response(
        JSON.stringify({ error: "signature_verification_failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("PayPal webhook signature verified successfully");

    // Parse webhook body
    let webhook;
    try {
      webhook = JSON.parse(rawBody);
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("=== FULL WEBHOOK DATA ===");
    console.log(JSON.stringify(webhook, null, 2));
    console.log("=== END WEBHOOK DATA ===");

    // Create Supabase client with service role key (bypasses RLS and auth)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("Environment check:", {
      supabaseUrl: supabaseUrl ? "✓ Set" : "✗ Missing",
      serviceRoleKey: serviceRoleKey ? "✓ Set" : "✗ Missing",
    });

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing required environment variables");
      return new Response(JSON.stringify({ error: "Configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client with service role (bypasses authentication)
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log("PayPal webhook event type:", webhook.event_type);

    if (webhook.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      console.log("=== PROCESSING PAYMENT.CAPTURE.COMPLETED ===");

      // Extract order ID from webhook
      const paymentId =
        webhook.resource?.supplementary_data?.related_ids?.order_id;
      console.log("Extracted payment ID:", paymentId);

      if (!paymentId) {
        console.error("No order ID found in webhook");
        console.error("Available data:", {
          resource: !!webhook.resource,
          supplementary_data: !!webhook.resource?.supplementary_data,
          related_ids: !!webhook.resource?.supplementary_data?.related_ids,
        });
        return new Response(JSON.stringify({ error: "No order ID found" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update payment status in database
      console.log("Updating payment status to completed...");
      const { data: payment, error: updateError } = await supabaseClient
        .from("payments")
        .update({
          payment_status: "completed",
          paypal_payment_id: webhook.resource.id,
          updated_at: new Date().toISOString(),
        })
        .eq("paypal_order_id", paymentId)
        .select()
        .single();

      if (updateError) {
        console.error("Failed to update payment:", updateError);
        return new Response(
          JSON.stringify({
            error: "Payment update failed",
            details: updateError,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (!payment) {
        console.error("Payment not found for order ID:", paymentId);
        return new Response(JSON.stringify({ error: "Payment not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("Payment updated successfully:", payment);

      // Elite Yearly handling (one-time): when payment_type indicates elite yearly, grant lifetime and consume a seat
      try {
        if ((payment?.payment_type || "").toLowerCase() === "elite_yearly") {
          // Check seats availability
          const { data: seatStats } = await supabaseClient
            .from("elite_seat_stats")
            .select("seats_available, seats_taken")
            .single();
          if (!seatStats || seatStats.seats_available <= 0) {
            console.error("Elite seats full at capture time; cannot assign seat for yearly purchase");
          } else {
            // See if user already has elite
            const { data: existing } = await supabaseClient
              .from("elite_memberships")
              .select("id, status, seat_number")
              .eq("user_id", payment.user_id)
              .in("status", ["monthly_active", "lifetime"]);

            let seatNumber: number | null = null;
            if (existing && existing.length > 0) {
              seatNumber = existing[0].seat_number || null;
            } else {
              // find smallest available seat 1..50
              const { data: currentSeats } = await supabaseClient
                .from("elite_memberships")
                .select("seat_number")
                .in("status", ["monthly_active", "lifetime"]);
              const taken = new Set<number>((currentSeats || []).map((r: any) => r.seat_number).filter((n: number) => !!n));
              let s = 1;
              while (s <= 50 && taken.has(s)) s++;
              seatNumber = s <= 50 ? s : null;
            }

            if (seatNumber == null) {
              console.error("No seat available to assign for elite yearly");
            } else {
              if (existing && existing.length > 0) {
                // upgrade to lifetime
                const { error: upd } = await supabaseClient
                  .from("elite_memberships")
                  .update({ status: "lifetime", lifetime_granted_at: new Date().toISOString(), seat_number: seatNumber })
                  .eq("id", existing[0].id);
                if (upd) console.error("Failed to upgrade existing elite to lifetime:", upd);
              } else {
                const { error: ins } = await supabaseClient
                  .from("elite_memberships")
                  .insert({
                    user_id: payment.user_id,
                    status: "lifetime",
                    months_paid_count: 12,
                    lifetime_granted_at: new Date().toISOString(),
                    seat_number: seatNumber,
                    last_payment_at: new Date().toISOString(),
                  });
                if (ins) console.error("Failed to insert elite lifetime membership:", ins);
              }

              // Reflect elite tier on user
              const { error: userErr } = await supabaseClient
                .from("users")
                .update({ membership_tier: "elite", updated_at: new Date().toISOString() })
                .eq("id", payment.user_id);
              if (userErr) console.error("Failed to set user elite tier:", userErr);
            }
          }
        }
      } catch (e) {
        console.error("Elite yearly handling error:", e);
      }

      // Add user to event only if this payment is for an event
      if (payment.event_id) {
        console.log("Adding user to event...");
        const { error: eventError } = await supabaseClient
          .from("user_events")
          .insert({
            user_id: payment.user_id,
            event_id: payment.event_id,
            payment_status: "paid",
            payment_id: payment.id,
            referred_by: payment.referred_by,
          });

        if (eventError) {
          console.error("Failed to add user to event:", eventError);
          // Don't return error, continue processing
        } else {
          console.log("User added to event successfully");
        }
      }

      // Process commissions
      console.log("Processing commissions...");
      await processCommissions(supabaseClient, payment);

      console.log("Payment processed successfully:", paymentId);
    } else {
      console.log("=== UNHANDLED WEBHOOK EVENT ===");
      console.log("Event type:", webhook.event_type);
      console.log("Available event types we handle:", [
        "PAYMENT.CAPTURE.COMPLETED",
      ]);
    }

    console.log("=== WEBHOOK PROCESSING COMPLETED ===");
    return new Response(
      JSON.stringify({ success: true, message: "Webhook processed" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in paypal-webhook:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function processCommissions(supabaseClient: any, payment: any) {
  const commissions = [];

  try {
    // Referrer commission (20%)
    if (payment.referred_by && payment.referrer_commission > 0) {
      const { data: referrer } = await supabaseClient
        .from("users")
        .select("id, paypal_email")
        .eq("username", payment.referred_by)
        .single();

      if (referrer?.paypal_email) {
        commissions.push({
          user_id: referrer.id,
          payment_id: payment.id,
          commission_type: "referrer",
          amount: payment.referrer_commission,
        });
      }
    }

    // Event host commission (10%)
    if (payment.event_host_commission > 0) {
      const { data: event } = await supabaseClient
        .from("events")
        .select("host_user_id")
        .eq("id", payment.event_id)
        .single();

      if (event?.host_user_id) {
        commissions.push({
          user_id: event.host_user_id,
          payment_id: payment.id,
          commission_type: "event_host",
          amount: payment.event_host_commission,
        });
      }
    }

    // Insert commission records
    if (commissions.length > 0) {
      const { error: commissionError } = await supabaseClient
        .from("commission_payouts")
        .insert(commissions);

      if (commissionError) {
        console.error("Failed to create commission records:", commissionError);
      } else {
        console.log("Commission records created:", commissions.length);
      }
    }
  } catch (error) {
    console.error("Error processing commissions:", error);
  }
}
