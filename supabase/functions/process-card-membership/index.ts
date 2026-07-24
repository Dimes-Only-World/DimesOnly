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
    console.log("process-card-membership request received");

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
      user_id,
      tier,
      amount,
      cadence,
      card_number,
      expiry_month,
      expiry_year,
      cvv,
      card_holder_name,
      billing_address, // Optional: { country_code, postal_code, address_line_1, admin_area_1, admin_area_2 }
    } = requestBody;

    // Validate required fields
    if (!user_id || !tier || !amount) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: user_id, tier, amount" }),
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

    console.log("PayPal API configuration:", {
      environment: paypalEnvironment,
      baseUrl: PAYPAL_BASE_URL,
      timestamp: new Date().toISOString(),
    });

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
    console.log("PayPal access token obtained for membership card payment");

    // Clean card number (remove spaces/dashes)
    const cleanCardNumber = card_number.replace(/[\s-]/g, "");

    // Build card object with optional billing address and 3DS verification
    const cardPaymentSource: Record<string, unknown> = {
      number: cleanCardNumber,
      expiry: `${expiry_year}-${expiry_month.padStart(2, "0")}`,
      security_code: cvv,
      name: card_holder_name,
      // Add 3DS verification attributes for SCA compliance
      attributes: {
        verification: {
          method: "SCA_WHEN_REQUIRED", // or SCA_ALWAYS for stricter testing
        },
      },
    };

    // Add billing address if provided (improves success rate with PayPal)
    if (billing_address) {
      cardPaymentSource.billing_address = {
        country_code: billing_address.country_code || "US",
        postal_code: billing_address.postal_code,
        address_line_1: billing_address.address_line_1,
        admin_area_1: billing_address.admin_area_1, // State/province
        admin_area_2: billing_address.admin_area_2, // City
      };
    }

    // Create order with card payment using PayPal Advanced Checkout (Orders API v2)
    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: parsedAmount.toFixed(2),
          },
          description: `${tier.charAt(0).toUpperCase() + tier.slice(1)} Membership${cadence ? ` - ${cadence}` : ''}`,
        },
      ],
      payment_source: {
        card: cardPaymentSource,
      },
    };

    console.log("Creating PayPal order for membership payment...");

    const orderResponse = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `membership-${tier}-${user_id}-${Date.now()}`,
      },
      body: JSON.stringify(orderPayload),
    });

    const orderData = await orderResponse.json();
    console.log("PayPal order response status:", orderResponse.status);
    console.log("PayPal order response data:", JSON.stringify(orderData));

    if (!orderResponse.ok) {
      console.error("PayPal order error:", JSON.stringify(orderData));
      
      // Extract detailed error information for debugging
      const debugId = orderData.debug_id || "unknown";
      const paypalErrorName = orderData.name || "UNKNOWN_ERROR";
      const paypalMessage = orderData.message || "";
      
      // Extract user-friendly error message
      let errorMessage = "Card payment failed. Please check your card details.";
      let errorDetails: string[] = [];
      
      if (orderData.details && orderData.details.length > 0) {
        errorDetails = orderData.details.map((d: { issue?: string; description?: string }) => 
          `${d.issue || "ERROR"}: ${d.description || "Unknown issue"}`
        );
        
        const detail = orderData.details[0];
        if (detail.issue === "CARD_VALIDATION_ERROR") {
          errorMessage = "Invalid card details. Please check and try again.";
        } else if (detail.issue === "CARD_EXPIRED") {
          errorMessage = "Your card has expired.";
        } else if (detail.issue === "INSUFFICIENT_FUNDS") {
          errorMessage = "Insufficient funds on card.";
        } else if (detail.issue === "TRANSACTION_REFUSED") {
          errorMessage = "Transaction was declined by your bank.";
        } else if (detail.issue === "PERMISSION_DENIED") {
          errorMessage = "Card payments not enabled for this merchant account. Please use PayPal.";
        } else if (detail.issue === "PAYEE_NOT_ENABLED_FOR_CARD_PROCESSING") {
          errorMessage = "Card payments not enabled. Please use PayPal checkout instead.";
        } else if (detail.description) {
          errorMessage = detail.description;
        }
      } else if (paypalErrorName === "UNPROCESSABLE_ENTITY") {
        errorMessage = "Unable to process this card. Please try PayPal checkout or a different card.";
      }
      
      console.error("PayPal error summary:", { debugId, paypalErrorName, paypalMessage, errorDetails });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage,
          debug_id: debugId,
          paypal_error: paypalErrorName,
          details: errorDetails,
        }),
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

    // Now save the payment and update membership in the database
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Create membership upgrade record
    const { data: upgradeData, error: upgradeError } = await supabase
      .from("membership_upgrades")
      .insert({
        user_id: user_id,
        upgrade_type: tier,
        payment_amount: parsedAmount,
        payment_method: "card",
        installment_plan: false,
        installment_count: 1,
        payment_status: "completed",
        upgrade_status: "completed",
        paypal_order_id: orderData.id,
        paypal_payment_id: captureId,
      })
      .select()
      .single();

    if (upgradeError) {
      console.error("Error saving membership upgrade:", upgradeError);
    } else {
      console.log("Membership upgrade saved:", upgradeData?.id);
    }

    // Update user's membership tier
    const { error: userUpdateError } = await supabase
      .from("users")
      .update({ 
        membership_tier: tier,
        ...(tier === 'silver_plus' ? { 
          silver_plus_active: true, 
          silver_plus_joined_at: new Date().toISOString() 
        } : {})
      })
      .eq("id", user_id);

    if (userUpdateError) {
      console.error("Error updating user membership tier:", userUpdateError);
    } else {
      console.log("User membership tier updated to:", tier);
    }

    // Insert payment record
    const { error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_id: user_id,
        amount: parsedAmount,
        payment_type: "membership",
        payment_status: "completed",
        paypal_order_id: orderData.id,
        paypal_transaction_id: captureId,
        currency: "USD",
      });

    if (paymentError) {
      console.error("Error saving payment:", paymentError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        capture_id: captureId,
        order_id: orderData.id,
        amount: parsedAmount,
        tier: tier,
        cadence: cadence,
        upgrade_id: upgradeData?.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error in process-card-membership:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to process card payment",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
