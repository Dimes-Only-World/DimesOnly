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
      return new Response(
        JSON.stringify({ success: false, error: "Failed to authenticate with payment processor" }),
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
    const { error: transactionError } = await supabase
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
      });

    if (transactionError) {
      console.error("Error saving event transaction:", transactionError);
    }

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
