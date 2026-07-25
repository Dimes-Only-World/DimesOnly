import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// PayPal fee calculation (2.75% + $0.50)
const PAYPAL_PERCENT_FEE = 0.0275;
const PAYPAL_FIXED_FEE = 0.50;

// Commission rates
const EVENT_OWNER_RATE = 0.70; // 70% to event owner after fees

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      order_id,
      event_id,
      event_owner_id,
      buyer_id,
      buyer_username,
      amount,
      ticket_type,
      ticket_quantity,
    } = await req.json();

    console.log("=== CAPTURE EVENT PAYMENT STARTED ===");
    console.log("Order ID:", order_id);
    console.log("Event ID:", event_id);
    console.log("Event Owner ID:", event_owner_id);
    console.log("Buyer ID:", buyer_id);
    console.log("Amount:", amount);

    // Validate required fields
    if (!order_id || !event_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: order_id, event_id" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const paypalClientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const paypalClientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    const paypalEnvironment = Deno.env.get("PAYPAL_ENVIRONMENT") || "sandbox";

    if (!supabaseUrl || !serviceRoleKey || !paypalClientId || !paypalClientSecret) {
      console.error("Missing environment variables");
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // PayPal API setup
    const PAYPAL_BASE_URL = paypalEnvironment === "live" || paypalEnvironment === "production"
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
        : "Payment authentication failed.";
      return new Response(
        JSON.stringify({ success: false, error: friendly, paypal_environment: env, debug_id: parsed?.debug_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const { access_token } = await tokenResponse.json();
    console.log("PayPal access token obtained");

    // Capture the PayPal order
    const captureResponse = await fetch(
      `${PAYPAL_BASE_URL}/v2/checkout/orders/${order_id}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!captureResponse.ok) {
      const errorText = await captureResponse.text();
      console.error("PayPal capture error:", captureResponse.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: "Payment capture failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const captureData = await captureResponse.json();
    console.log("PayPal capture response:", JSON.stringify(captureData, null, 2));

    // Verify payment status
    if (captureData.status !== "COMPLETED") {
      console.error("Payment not completed:", captureData.status);
      return new Response(
        JSON.stringify({ success: false, error: `Payment status: ${captureData.status}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Extract transaction details
    const capturedAmount = parseFloat(
      captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || amount
    );
    const transactionId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id || order_id;

    console.log("Captured amount:", capturedAmount);
    console.log("Transaction ID:", transactionId);

    // Check for duplicate transactions
    const { data: existingTx } = await supabase
      .from("event_transactions")
      .select("id")
      .eq("paypal_transaction_id", transactionId)
      .single();

    if (existingTx) {
      console.log("Duplicate transaction detected:", transactionId);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Payment already processed",
          transaction_id: transactionId,
          payment_id: existingTx.id 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate fees and allocations
    const grossAmount = capturedAmount;
    const paypalFee = (grossAmount * PAYPAL_PERCENT_FEE) + PAYPAL_FIXED_FEE;
    const netAmount = grossAmount - paypalFee;
    const ownerEarnings = netAmount * EVENT_OWNER_RATE;
    const platformFee = netAmount - ownerEarnings;

    console.log("Fee breakdown:", {
      gross: grossAmount,
      paypalFee,
      net: netAmount,
      ownerEarnings,
      platformFee,
    });

    // Update payment record
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .update({
        payment_status: "completed",
        paypal_payment_id: transactionId,
        paypal_transaction_id: transactionId,
        platform_fee: platformFee,
        updated_at: new Date().toISOString(),
      })
      .eq("paypal_order_id", order_id)
      .select()
      .single();

    if (paymentError) {
      console.error("Failed to update payment record:", paymentError);
      // Continue processing even if this fails
    }

    // Get event owner ID if not provided
    let finalEventOwnerId = event_owner_id;
    if (!finalEventOwnerId) {
      const { data: eventData } = await supabase
        .from("events")
        .select("host_user_id")
        .eq("id", event_id)
        .single();
      finalEventOwnerId = eventData?.host_user_id;
    }

    // Create event transaction record
    const { data: eventTx, error: txError } = await supabase
      .from("event_transactions")
      .insert({
        event_id,
        event_owner_id: finalEventOwnerId,
        buyer_id,
        payment_id: payment?.id,
        paypal_transaction_id: transactionId,
        amount: grossAmount,
        currency: "USD",
        payment_status: "completed",
      })
      .select()
      .single();

    if (txError) {
      console.error("Failed to create event transaction:", txError);
    } else {
      console.log("Event transaction created:", eventTx.id);
    }

    // Add user to event (user_events table)
    const { error: userEventError } = await supabase
      .from("user_events")
      .upsert(
        {
          user_id: buyer_id,
          event_id,
          username: buyer_username || "guest",
          payment_status: "paid",
          payment_id: payment?.id,
          ticket_type: ticket_type || "general",
          ticket_quantity: ticket_quantity || 1,
        },
        { onConflict: "user_id,event_id" }
      );

    if (userEventError) {
      console.error("Failed to add user to event:", userEventError);
    } else {
      console.log("User added to event successfully");
    }

    // Allocate earnings to event owner
    if (finalEventOwnerId && ownerEarnings > 0) {
      // Create earnings record
      const { error: earningsError } = await supabase
        .from("event_owner_earnings")
        .insert({
          user_id: finalEventOwnerId,
          event_id,
          transaction_id: eventTx?.id,
          amount: ownerEarnings,
          earnings_type: "ticket_sale",
        });

      if (earningsError) {
        console.error("Failed to create earnings record:", earningsError);
      }

      // Update user's event earnings via direct SQL update
      const { data: currentUser } = await supabase
        .from("users")
        .select("event_total_earnings, event_available_balance")
        .eq("id", finalEventOwnerId)
        .single();

      const currentTotal = currentUser?.event_total_earnings || 0;
      const currentBalance = currentUser?.event_available_balance || 0;

      const { error: updateError } = await supabase
        .from("users")
        .update({
          event_total_earnings: currentTotal + ownerEarnings,
          event_available_balance: currentBalance + ownerEarnings,
          updated_at: new Date().toISOString(),
        })
        .eq("id", finalEventOwnerId);

      if (updateError) {
        console.error("Failed to update owner earnings:", updateError);
      } else {
        console.log("Event owner earnings allocated:", ownerEarnings);
      }
    }

    // Award 20% direct + 10% upline referral commissions on the ticket purchase
    await awardEventReferralCommissions(
      supabase,
      buyer_id,
      grossAmount,
      event_id,
      eventTx?.id ?? null,
    );

    console.log("=== CAPTURE EVENT PAYMENT COMPLETED ===");


    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: transactionId,
        payment_id: payment?.id || eventTx?.id,
        amount: grossAmount,
        owner_earnings: ownerEarnings,
        message: "Payment captured and processed successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error capturing payment:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Payment processing failed",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
