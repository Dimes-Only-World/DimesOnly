import { getCallerId, getVerifiedAdminId, AUTH_HEADERS } from "../_shared/caller.ts";
import { fulfillEventPayment } from "../_shared/eventFulfill.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": AUTH_HEADERS,
};


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
    { const _caller = await getCallerId(req); if ((buyer_id) && _caller !== String(buyer_id)) { if (!(await getVerifiedAdminId(req))) return new Response(JSON.stringify({ success: false, error: "Please sign in again to continue." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }); } }


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

    const supabaseFul = supabase;
    const result = await fulfillEventPayment(supabaseFul, {
      orderId: order_id, transactionId, grossAmount: capturedAmount, event_id, event_owner_id,
      buyer_id, buyer_username, ticket_type, ticket_quantity,
    });
    if (result.duplicate) {
      return new Response(
        JSON.stringify({ success: true, message: "Payment already processed", transaction_id: transactionId, payment_id: result.payment_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const grossAmount = capturedAmount;
    const ownerEarnings = result.ownerEarnings;
    const payment = { id: result.payment_id };
    const eventTx = null as any;

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

