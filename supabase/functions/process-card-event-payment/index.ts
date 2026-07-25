import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log("process-card-event-payment request received");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const paypalClientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const paypalClientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    const paypalEnvironment = Deno.env.get("PAYPAL_ENVIRONMENT") || "sandbox";

    console.log("Environment check:", {
      supabaseUrl: supabaseUrl ? "✓ Set" : "✗ Missing",
      serviceRoleKey: serviceRoleKey ? "✓ Set" : "✗ Missing",
      paypalClientId: paypalClientId ? "✓ Set" : "✗ Missing",
      paypalClientSecret: paypalClientSecret ? "✓ Set" : "✗ Missing",
      paypalEnvironment,
    });

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Supabase env vars missing" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (!paypalClientId || !paypalClientSecret) {
      return new Response(
        JSON.stringify({ success: false, error: "PayPal credentials missing" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const {
      event_id,
      event_name,
      buyer_id,
      buyer_username,
      event_owner_id,
      amount,
      ticket_type,
      ticket_quantity,
      card_number,
      expiry_month,
      expiry_year,
      cvv,
      card_holder_name,
    } = requestBody;

    // Validate required fields
    if (!event_id || !buyer_id || !amount) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: event_id, buyer_id, amount" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (!card_number || !expiry_month || !expiry_year || !cvv || !card_holder_name) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing card details" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Validate amount
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 1) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid amount." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const PAYPAL_BASE_URL =
      paypalEnvironment === "production" || paypalEnvironment === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com";

    // Get PayPal access token
    const auth = btoa(`${paypalClientId}:${paypalClientSecret}`);
    const tokenResponse = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("PayPal token error:", errorText);
      let parsed: any = {};
      try { parsed = JSON.parse(errorText); } catch {}
      const env = Deno.env.get("PAYPAL_ENVIRONMENT") || "sandbox";
      const isAuthMismatch = parsed?.error === "invalid_client" || tokenResponse.status === 401;
      const friendly = isAuthMismatch
        ? `PayPal rejected the credentials for PAYPAL_ENVIRONMENT="${env}". The PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET in Supabase secrets are for a different environment (or a different PayPal app). Update them to a matching ${env} REST app and redeploy.`
        : "Failed to authenticate with payment processor.";
      return new Response(
        JSON.stringify({ success: false, error: friendly, paypal_environment: env, debug_id: parsed?.debug_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { access_token } = await tokenResponse.json();
    console.log("PayPal access token obtained for card payment");

    // Clean card number (remove spaces/dashes)
    const cleanCardNumber = card_number.replace(/[\s-]/g, "");

    // Create order with card payment using PayPal Advanced Checkout (Orders API v2)
    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: parsedAmount.toFixed(2),
          },
          description: `Event ticket: ${event_name || event_id}`,
        },
      ],
      payment_source: {
        card: {
          number: cleanCardNumber,
          expiry: `${expiry_year}-${expiry_month.padStart(2, "0")}`,
          security_code: cvv,
          name: card_holder_name,
        },
      },
    };

    console.log("Creating PayPal order for event payment...");

    const orderResponse = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `event-${event_id}-${buyer_id}-${Date.now()}`,
      },
      body: JSON.stringify(orderPayload),
    });

    const orderData = await orderResponse.json();
    console.log("PayPal order response status:", orderResponse.status);

    if (!orderResponse.ok) {
      console.error("PayPal order error:", JSON.stringify(orderData));
      
      // Extract user-friendly error message
      let errorMessage = "Card payment failed. Please check your card details.";
      if (orderData.details && orderData.details.length > 0) {
        const detail = orderData.details[0];
        if (detail.issue === "CARD_VALIDATION_ERROR") {
          errorMessage = "Invalid card details. Please check and try again.";
        } else if (detail.issue === "CARD_EXPIRED") {
          errorMessage = "Your card has expired.";
        } else if (detail.issue === "INSUFFICIENT_FUNDS") {
          errorMessage = "Insufficient funds on card.";
        } else if (detail.issue === "TRANSACTION_REFUSED") {
          errorMessage = "Transaction was declined by your bank.";
        } else if (detail.description) {
          errorMessage = detail.description;
        }
      }
      
      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check if 3D Secure is required
    if (orderData.status === "PAYER_ACTION_REQUIRED") {
      console.log("3D Secure authentication required");
      const approveLink = orderData.links?.find((l: { rel: string }) => l.rel === "payer-action");
      
      return new Response(
        JSON.stringify({
          success: false,
          requires_action: true,
          action_url: approveLink?.href,
          order_id: orderData.id,
          error: "Your bank requires additional authentication. Please complete verification.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Order was created and captured in one step with card payment
    if (orderData.status !== "COMPLETED") {
      console.log("Order status:", orderData.status);
      return new Response(
        JSON.stringify({ success: false, error: `Payment not completed. Status: ${orderData.status}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Extract capture ID
    const captureId =
      orderData.purchase_units?.[0]?.payments?.captures?.[0]?.id || orderData.id;

    console.log("Card payment captured successfully, capture ID:", captureId);

    // Now save the payment and event registration to the database
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Insert payment record
    const { data: paymentData, error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_id: buyer_id,
        event_id: event_id,
        amount: parsedAmount,
        payment_type: "event_ticket",
        payment_status: "completed",
        paypal_order_id: orderData.id,
        paypal_transaction_id: captureId,
        currency: "USD",
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Error saving payment:", paymentError);
    } else {
      console.log("Payment saved:", paymentData?.id);
    }

    // Register user for the event
    const { error: userEventError } = await supabase
      .from("user_events")
      .upsert({
        user_id: buyer_id,
        username: buyer_username,
        event_id: event_id,
        payment_status: "paid",
        ticket_type: ticket_type || "general",
        quantity: ticket_quantity || 1,
      }, {
        onConflict: "user_id,event_id"
      });

    if (userEventError) {
      console.error("Error registering user for event:", userEventError);
    } else {
      console.log("User registered for event");
    }

    // Create event transaction record
    const { data: eventTx, error: transactionError } = await supabase
      .from("event_transactions")
      .insert({
        event_id: event_id,
        buyer_id: buyer_id,
        event_owner_id: event_owner_id || null,
        amount: parsedAmount,
        payment_status: "completed",
        paypal_transaction_id: captureId,
        payment_id: paymentData?.id || null,
        currency: "USD",
      })
      .select()
      .single();

    if (transactionError) {
      console.error("Error saving event transaction:", transactionError);
    }

    // Award 20% direct + 10% upline referral commissions
    await awardEventReferralCommissions(
      supabase,
      buyer_id,
      parsedAmount,
      event_id,
      eventTx?.id ?? captureId ?? null,
    );


    return new Response(
      JSON.stringify({
        success: true,
        capture_id: captureId,
        order_id: orderData.id,
        amount: parsedAmount,
        event_id: event_id,
        ticket_type: ticket_type,
        ticket_quantity: ticket_quantity,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error in process-card-event-payment:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to process card payment",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});

// 20% direct + 10% upline commission for event ticket purchases.
// Base = gross - ($0.50 + 2.75%). Idempotent per (referrer, payment_type, transaction_id).
async function awardEventReferralCommissions(
  supabase: any,
  buyerId: string | null | undefined,
  grossAmount: number,
  eventId: string,
  transactionId: string | null,
) {
  try {
    if (!buyerId || !grossAmount || grossAmount <= 0) return;
    const idempKey = transactionId || `${eventId}:${buyerId}`;

    const { data: buyer } = await supabase
      .from("users")
      .select("id, referred_by")
      .eq("id", buyerId)
      .single();
    if (!buyer?.referred_by) return;
    const referrerUsername = String(buyer.referred_by).trim();
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

    const upsertWeekly = async (uid: string, amount: number) => {
      const { data: existing } = await supabase
        .from("weekly_earnings")
        .select("id, referral_earnings, amount")
        .eq("user_id", uid)
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
          user_id: uid,
          week_start: wkStartStr,
          week_end: wkEndStr,
          amount,
          tip_earnings: 0,
          referral_earnings: amount,
          bonus_earnings: 0,
        });
      }
    };

    if (directAmt > 0) {
      const { data: existingDirect } = await supabase
        .from("payments")
        .select("id")
        .eq("user_id", referrer.id)
        .eq("payment_type", "event_referral_commission")
        .eq("paypal_transaction_id", idempKey)
        .maybeSingle();
      if (!existingDirect) {
        const { error } = await supabase.from("payments").insert({
          user_id: referrer.id,
          event_id: eventId,
          amount: directAmt,
          payment_type: "event_referral_commission",
          payment_status: "completed",
          paypal_transaction_id: idempKey,
          referred_by: referrer.username,
          referrer_commission: directAmt,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        if (!error) await upsertWeekly(referrer.id, directAmt);
        else console.error("event_referral_commission insert failed", error);
      }
    }

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
          .eq("payment_type", "event_upline_referral_commission")
          .eq("paypal_transaction_id", idempKey)
          .maybeSingle();
        if (!existingUpline) {
          const { error } = await supabase.from("payments").insert({
            user_id: upline.id,
            event_id: eventId,
            amount: uplineAmt,
            payment_type: "event_upline_referral_commission",
            payment_status: "completed",
            paypal_transaction_id: idempKey,
            referred_by: upline.username,
            referrer_commission: uplineAmt,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          if (!error) await upsertWeekly(upline.id, uplineAmt);
          else console.error("event_upline_referral_commission insert failed", error);
        }
      }
    }
  } catch (e) {
    console.error("awardEventReferralCommissions error", e);
  }
}

