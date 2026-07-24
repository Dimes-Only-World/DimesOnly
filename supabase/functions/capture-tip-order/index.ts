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
    console.log("capture-tip-order request body:", requestBody);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const paypalClientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const paypalClientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    const paypalEnvironment = Deno.env.get("PAYPAL_ENVIRONMENT") || "sandbox";

    console.log("capture-tip-order environment check:", {
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
      order_id,
      tipper_id,
      tipper_username,
      tipped_username,
      amount,
      referrer_username,
      tip_message,
    } = requestBody;

    if (!order_id || !tipper_id || !tipped_username || !amount) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: order_id, tipper_id, tipped_username, amount" }),
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
        : "Failed to get PayPal access token.";
      return new Response(
        JSON.stringify({ success: false, error: friendly, paypal_environment: env, debug_id: parsed?.debug_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { access_token } = await tokenResponse.json();
    console.log("PayPal access token obtained for capture");

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
      console.error("PayPal capture error:", errorText);
      return new Response(
        JSON.stringify({ success: false, error: `PayPal capture failed: ${errorText}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const captureData = await captureResponse.json();
    console.log("PayPal capture response:", {
      id: captureData.id,
      status: captureData.status,
    });

    if (captureData.status !== "COMPLETED") {
      return new Response(
        JSON.stringify({ success: false, error: `Payment not completed. Status: ${captureData.status}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Extract capture ID
    const captureId =
      captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id || order_id;

    console.log("Payment captured successfully, capture ID:", captureId);

    // Now call process-tip edge function to handle earnings and tickets
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: processTipResult, error: processTipError } = await supabase.functions.invoke(
      "process-tip",
      {
        body: {
          tipper_id,
          tipper_username: tipper_username || "anonymous",
          tipped_username,
          amount: Number(amount),
          message: tip_message || "",
          referrer_username: referrer_username || null,
          paypal_capture_id: captureId,
        },
      }
    );

    if (processTipError) {
      console.error("process-tip error:", processTipError);
      // Payment was captured but tip processing failed - log but don't fail the response
      return new Response(
        JSON.stringify({
          success: true,
          warning: "Payment captured but tip processing failed",
          capture_id: captureId,
          order_id: order_id,
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
        order_id: order_id,
        amount: amount,
        tipped_username,
        tickets: processTipResult?.tickets || [],
        process_tip_result: processTipResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error in capture-tip-order:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to capture tip payment",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
