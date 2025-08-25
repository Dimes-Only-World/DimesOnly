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

    // Determine payment type: 'event' | 'membership' | 'elite_yearly'
    const payment_type = requestBody.payment_type || "event";

    // Support both camelCase and snake_case parameter names
    const event_id = requestBody.event_id || requestBody.eventId;
    const user_id = requestBody.user_id || requestBody.userId;
    const payment_id = requestBody.payment_id || requestBody.paymentId;
    const description = requestBody.description;
    const return_url = requestBody.return_url || requestBody.returnUrl;
    const cancel_url = requestBody.cancel_url || requestBody.cancelUrl;
    const amount = requestBody.amount;
    const guest_name = requestBody.guest_name || requestBody.guestName;

    // Diamond Plus specific fields
    const membership_upgrade_id = requestBody.membership_upgrade_id;
    const installment_number = requestBody.installment_number || 1;

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let finalAmount: number;
    let orderDescription: string;
    let customId: string;
    let event: any = null;

    if (payment_type === "membership") {
      // Handle Diamond Plus membership payment
      if (!membership_upgrade_id || !user_id || !amount) {
        throw new Error(
          "Missing required fields for membership payment: membership_upgrade_id, user_id, amount"
        );
      } else if (payment_type === "elite_yearly") {
      // No DB side-effects here; webhook will handle granting lifetime on capture
    }

      // Fetch membership upgrade details
      const { data: upgrade, error: upgradeError } = await supabase
        .from("membership_upgrades")
        .select("*")
        .eq("id", membership_upgrade_id)
        .single();

      if (upgradeError || !upgrade) {
        throw new Error(
          `Membership upgrade not found: ${upgradeError?.message}`
        );
      }

      finalAmount = amount;
      orderDescription = upgrade.installment_plan
        ? `Diamond Plus Membership - Installment ${installment_number}/2`
        : "Diamond Plus Membership - Full Payment";
      customId = `membership_${membership_upgrade_id}_user_${user_id}_installment_${installment_number}`;

      console.log("=== Diamond Plus Payment Creation Started ===");
      console.log("Membership upgrade details:", {
        id: upgrade.id,
        upgrade_type: upgrade.upgrade_type,
        payment_amount: upgrade.payment_amount,
        installment_plan: upgrade.installment_plan,
        current_installment: installment_number,
      });
    } else if (payment_type === "elite_yearly") {
      // Elite lifetime one-time payment
      if (!user_id) {
        throw new Error("Missing required field for elite_yearly: user_id");
      }
      finalAmount = Number(amount) || 10000.0;
      orderDescription = "Elite Membership - Lifetime";
      customId = `elite_yearly_user_${user_id}`;
      console.log("=== Elite Yearly Order Creation Started ===");
    } else {
      // Handle event ticket payment (existing logic)
      if (!event_id || !user_id) {
        throw new Error(
          "Missing required fields for event payment: event_id, user_id"
        );
      }

      // Fetch current event details including pricing
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("id, name, price, max_attendees")
        .eq("id", event_id)
        .single();

      if (eventError || !eventData) {
        throw new Error(`Event not found: ${eventError?.message}`);
      }

      event = eventData;

      // Calculate current_attendees by counting entries in user_events table
      const { count: currentAttendees, error: countError } = await supabase
        .from("user_events")
        .select("*", { count: "exact", head: true })
        .eq("event_id", event_id);

      if (countError) {
        throw new Error(`Failed to count attendees: ${countError.message}`);
      }

      // Check if event is sold out
      if (currentAttendees >= event.max_attendees) {
        throw new Error("Event is sold out");
      }

      finalAmount = amount || event.price;
      orderDescription = description || `Event Ticket Purchase - ${event.name}`;
      customId = `event_${event_id}_user_${user_id}`;

      console.log("=== PayPal Event Order Creation Started ===");
      console.log("Event details:", {
        id: event.id,
        name: event.name,
        price: event.price,
        max_attendees: event.max_attendees,
        current_attendees: currentAttendees,
      });
    }

    // PayPal API credentials
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
      throw new Error(`Failed to get PayPal access token: ${errorText}`);
    }

    const { access_token } = await tokenResponse.json();
    console.log("PayPal access token obtained");

    // Create PayPal order
    const orderData = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: payment_id || membership_upgrade_id,
          description: orderDescription,
          amount: {
            currency_code: "USD",
            value: finalAmount.toFixed(2),
          },
          custom_id: customId,
        },
      ],
      application_context: {
        return_url: return_url,
        cancel_url: cancel_url,
        brand_name:
          payment_type === "membership"
            ? "Dimes Only World - Diamond Plus"
            : payment_type === "elite_yearly"
            ? "Dimes Only World - Elite"
            : "Dancers Events Network",
        user_action: "PAY_NOW",
        landing_page: "BILLING",
        payment_method: {
          payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED",
        },
      },
    };

    console.log("Creating PayPal order with data:", {
      intent: orderData.intent,
      amount: orderData.purchase_units[0].amount.value,
      description: orderData.purchase_units[0].description,
      payment_type,
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
      type: payment_type,
    });

    // Find the approval URL
    const approvalUrl = order.links?.find(
      (link: any) => link.rel === "approve"
    )?.href;

    if (!approvalUrl) {
      throw new Error("No approval URL found in PayPal response");
    }

    // Update payment record based on type
    if (payment_type === "membership" && membership_upgrade_id) {
      // Update membership upgrade record with PayPal order ID
      const { error: updateError } = await supabase
        .from("membership_upgrades")
        .update({
          paypal_order_id: order.id,
          payment_status: "pending_payment",
        })
        .eq("id", membership_upgrade_id);

      if (updateError) {
        console.error("Failed to update membership upgrade:", updateError);
      }

      // If installment plan, create installment payment record
      if (installment_number) {
        const { error: installmentError } = await supabase
          .from("installment_payments")
          .insert({
            membership_upgrade_id: membership_upgrade_id,
            installment_number: installment_number,
            amount: finalAmount,
            due_date: new Date().toISOString(),
            paypal_order_id: order.id,
            status: "pending",
          });

        if (installmentError) {
          console.error(
            "Failed to create installment payment record:",
            installmentError
          );
        }
      }
    } else if (payment_id) {
      // Update event payment record (existing logic)
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
        success: true,
        order_id: order.id,
        approval_url: approvalUrl,
        amount: finalAmount,
        event_name:
          payment_type === "membership"
            ? "Diamond Plus Membership"
            : payment_type === "elite_yearly"
            ? "Elite Lifetime"
            : event?.name || "Event Ticket",
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
        success: false,
        error: error.message || "Failed to create PayPal order",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
