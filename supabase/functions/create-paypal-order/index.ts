import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request body
    const requestBody = await req.json();
    console.log("Request body received:", requestBody);

    // Check environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const paypalClientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const paypalClientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    const paypalEnvironment = Deno.env.get("PAYPAL_ENVIRONMENT") || "sandbox";
    const frontendUrl = Deno.env.get("FRONTEND_URL");

    console.log("Environment variables check:", {
      supabaseUrl: supabaseUrl ? "✓ Set" : "✗ Missing",
      serviceRoleKey: serviceRoleKey ? "✓ Set" : "✗ Missing",
      paypalClientId: paypalClientId ? "✓ Set" : "✗ Missing",
      paypalClientSecret: paypalClientSecret ? "✓ Set" : "✗ Missing",
      paypalEnvironment,
      frontendUrl: frontendUrl ? "✓ Set" : "✗ Missing",
    });

    // Support both camelCase and snake_case parameter names
    const event_id = requestBody.event_id || requestBody.eventId;
    const user_id = requestBody.user_id || requestBody.userId;
    const payment_id = requestBody.payment_id || requestBody.paymentId;
    const description = requestBody.description || `Event Ticket Purchase`;
    const return_url = requestBody.return_url || requestBody.returnUrl;
    const cancel_url = requestBody.cancel_url || requestBody.cancelUrl;
    const amount = requestBody.amount; // Optional, we'll get from the event if not provided
    const guest_name = requestBody.guest_name || requestBody.guestName; // Guest name for the event

    // Validate required fields
    const missingFields = {};
    if (!event_id) missingFields.eventId = undefined;
    if (!user_id) missingFields.userId = undefined;
    if (!amount && !event_id) missingFields.amount = undefined; // Either amount or event_id is required

    if (Object.keys(missingFields).length > 0) {
      console.error("Missing required fields:", missingFields);
      throw new Error(
        `Missing required fields: ${JSON.stringify(missingFields)}`
      );
    }

    console.log("Validating input:", {
      eventId: event_id,
      userId: user_id,
      amount,
      referrer: requestBody.referrer,
    });

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch current event details including pricing
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, name, price, max_attendees")
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      throw new Error(`Event not found: ${eventError?.message}`);
    }

    // Calculate current_attendees by counting entries in user_events table
    const { count: currentAttendees, error: countError } = await supabase
      .from("user_events")
      .select("*", { count: "exact", head: true })
      .eq("event_id", event_id);

    if (countError) {
      throw new Error(`Failed to count attendees: ${countError.message}`);
    }

    // Use provided amount or fall back to event price
    const finalAmount = amount || event.price;

    // Check if event is sold out
    if (currentAttendees >= event.max_attendees) {
      throw new Error("Event is sold out");
    }

    console.log("=== PayPal Order Creation Started ===");
    console.log("Event details:", {
      id: event.id,
      name: event.name,
      price: event.price,
      max_attendees: event.max_attendees,
      current_attendees: currentAttendees,
    });

    // PayPal API credentials
    const PAYPAL_BASE_URL =
      paypalEnvironment === "production"
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
      throw new Error(`Failed to get PayPal access token: ${errorText}`);
    }

    const { access_token } = await tokenResponse.json();
    console.log("PayPal access token obtained");

    // Create PayPal order with live pricing
    const orderData = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: payment_id,
          description: description,
          amount: {
            currency_code: "USD",
            value: finalAmount.toFixed(2),
          },
          custom_id: `event_${event_id}_user_${user_id}`,
        },
      ],
      application_context: {
        return_url: return_url,
        cancel_url: cancel_url,
        brand_name: "Dancers Events Network",
        user_action: "PAY_NOW",
      },
    };

    console.log("Creating PayPal order with data:", {
      intent: orderData.intent,
      amount: orderData.purchase_units[0].amount.value,
      description: orderData.purchase_units[0].description,
    });

    const orderResponse = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderData),
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error("PayPal order error:", errorText);
      throw new Error(`PayPal order creation failed: ${errorText}`);
    }

    const order = await orderResponse.json();
    console.log("PayPal order created:", {
      id: order.id,
      status: order.status,
    });

    // Find the approval URL
    const approvalUrl = order.links?.find(
      (link: any) => link.rel === "approve"
    )?.href;

    if (!approvalUrl) {
      throw new Error("No approval URL found in PayPal response");
    }

    // Update payment record with PayPal order ID and current price
    if (payment_id) {
      const { error: updateError } = await supabase
        .from("payments")
        .update({
          paypal_order_id: order.id,
          amount: finalAmount,
          guest_name: guest_name || null, // Store guest name in payment record
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment_id);

      if (updateError) {
        console.error("Failed to update payment record:", updateError);
      }
    }

    console.log("=== PayPal Order Creation Completed ===");

    return new Response(
      JSON.stringify({
        order_id: order.id,
        approval_url: approvalUrl,
        amount: finalAmount,
        event_name: event.name,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating PayPal order:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to create PayPal order",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
