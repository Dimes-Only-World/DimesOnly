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
    console.log("process-card-tip request received");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const paypalClientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const paypalClientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    const paypalEnvironment = Deno.env.get("PAYPAL_ENVIRONMENT") || "sandbox";

    console.log("process-card-tip environment check:", {
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
      tipper_id,
      tipper_username,
      tipped_username,
      amount,
      referrer_username,
      tip_message,
      card_number,
      expiry_month,
      expiry_year,
      cvv,
      card_holder_name,
    } = requestBody;

    // Validate required fields
    if (!tipper_id || !tipped_username || !amount) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: tipper_id, tipped_username, amount" }),
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
    if (!Number.isFinite(parsedAmount) || parsedAmount < 5 || parsedAmount > 1000) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid amount. Must be between $5 and $1000." }),
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
          description: `Tip to @${tipped_username}`,
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

    console.log("Creating PayPal order with card payment...");

    const orderResponse = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `tip-${tipper_id}-${Date.now()}`,
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

    // Now call process-tip edge function to handle earnings and tickets
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: processTipResult, error: processTipError } = await supabase.functions.invoke(
      "process-tip",
      {
        body: {
          tipper_id,
          tipper_username: tipper_username || "anonymous",
          tipped_username,
          amount: parsedAmount,
          message: tip_message || "",
          referrer_username: referrer_username || null,
          paypal_capture_id: captureId,
        },
      }
    );

    if (processTipError) {
      console.error("process-tip error:", processTipError);
      // Payment was captured but tip processing failed - return partial success
      return new Response(
        JSON.stringify({
          success: true,
          warning: "Payment captured but tip processing failed",
          capture_id: captureId,
          order_id: orderData.id,
          error_details: processTipError.message,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log("process-tip result:", processTipResult);

    return new Response(
      JSON.stringify({
        success: true,
        capture_id: captureId,
        order_id: orderData.id,
        amount: parsedAmount,
        tipped_username,
        tickets: processTipResult?.tickets || processTipResult?.ticket_codes || [],
        process_tip_result: processTipResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error in process-card-tip:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to process card payment",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
