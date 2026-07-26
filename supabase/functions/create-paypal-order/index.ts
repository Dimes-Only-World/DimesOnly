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

    // Fail early if critical envs are missing
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Supabase env vars missing (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }
    if (!paypalClientId || !paypalClientSecret) {
      return new Response(
        JSON.stringify({ success: false, error: "PayPal credentials missing (PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET)." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    // Determine payment type: 'event' | 'membership' | 'elite_yearly' | 'tip'
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

    // Tip specific fields
    const tipper_id = requestBody.tipper_id;
    const tipper_username = requestBody.tipper_username;
    const tipped_username = requestBody.tipped_username;
    const tip_message = requestBody.tip_message;

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let finalAmount: number;
    let orderDescription: string;
    let customId: string;
    let event: any = null;

    if (payment_type === "tip") {
      // Handle tip payment
      if (!tipper_id || !tipped_username || !amount) {
        throw new Error(
          "Missing required fields for tip payment: tipper_id, tipped_username, amount"
        );
      }

      const parsedAmount = Number(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount < 5 || parsedAmount > 1000) {
        throw new Error("Tip amount must be between $5 and $1000");
      }

      finalAmount = parsedAmount;
      orderDescription = `Tip for ${tipped_username}`;
      customId = `tip_${tipper_id}_to_${tipped_username}_${Date.now()}`;

      console.log("=== Tip Payment Order Creation Started ===");
      console.log("Tip details:", {
        tipper_id,
        tipper_username,
        tipped_username,
        amount: parsedAmount,
      });
    } else if (payment_type === "membership") {
      // Handle Diamond Plus membership payment
      if (!membership_upgrade_id || !user_id || !amount) {
        throw new Error(
          "Missing required fields for membership payment: membership_upgrade_id, user_id, amount"
        );
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
        return new Response(
          JSON.stringify({ success: false, error: "Missing required field for elite_yearly: user_id" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
        );
      }
      finalAmount = Number(amount ?? 10000.0);
      if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid amount for elite_yearly" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
        );
      }
      orderDescription = "Elite Membership - Lifetime";
      customId = `elite_yearly_user_${user_id}`;
      console.log("=== Elite Yearly Order Creation Started ===");

      // Seat-cap preflight: ensure seats are available
      try {
        const { data: seatStats, error: seatErr } = await supabase
          .from("elite_seat_stats")
          .select("seats_available")
          .single();
        if (seatErr) {
          console.warn("Seat stats fetch failed (non-blocking):", seatErr?.message);
        } else if (seatStats && typeof seatStats.seats_available === "number" && seatStats.seats_available <= 0) {
          return new Response(
            JSON.stringify({ success: false, error: "Elite is full. No seats available.", code: "ELITE_FULL" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 },
          );
        }
      } catch (e) {
        console.warn("Seat-cap preflight exception (ignored):", e);
      }
    } else if (payment_type === "elite_plus_lifetime") {
      // Elite Plus lifetime one-time payment ($15,000)
      if (!user_id) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing required field for elite_plus_lifetime: user_id" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
        );
      }
      finalAmount = Number(amount ?? 15000.0);
      if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid amount for elite_plus_lifetime" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
        );
      }
      orderDescription = "Elite Plus Membership - Lifetime";
      customId = `elite_plus_lifetime_user_${user_id}`;
      console.log("=== Elite Plus Lifetime Order Creation Started ===");

      // Seat-cap preflight: shares 50-seat cap with elite
      try {
        const { data: seatStats, error: seatErr } = await supabase
          .from("elite_seat_stats")
          .select("seats_available")
          .single();
        if (seatErr) {
          console.warn("Seat stats fetch failed (non-blocking):", seatErr?.message);
        } else if (seatStats && typeof seatStats.seats_available === "number" && seatStats.seats_available <= 0) {
          return new Response(
            JSON.stringify({ success: false, error: "Elite is full. No seats available.", code: "ELITE_FULL" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 },
          );
        }
      } catch (e) {
        console.warn("Seat-cap preflight exception (ignored):", e);
      }
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
      if ((currentAttendees ?? 0) >= event.max_attendees) {
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
      let parsed: any = {};
      try { parsed = JSON.parse(errorText); } catch {}
      const env = Deno.env.get("PAYPAL_ENVIRONMENT") || "sandbox";
      const isAuthMismatch = parsed?.error === "invalid_client" || tokenResponse.status === 401;
      if (isAuthMismatch) {
        throw new Error(`PayPal rejected the credentials for PAYPAL_ENVIRONMENT="${env}". The PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET in Supabase secrets are for a different environment (or a different PayPal app). Update them to a matching ${env} REST app and redeploy.`);
      }
      throw new Error(`Failed to get PayPal access token: ${errorText}`);
    }

    const { access_token } = await tokenResponse.json();
    console.log("PayPal access token obtained");

    // Create PayPal order
    // Ensure we always have a reference_id for traceability
    const referenceId = (payment_id || membership_upgrade_id || undefined) as
      | string
      | undefined;

    const orderData = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: referenceId ?? customId,
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
          payment_type === "tip"
            ? "Dimes Only World - Tips"
            : payment_type === "membership"
            ? "Dimes Only World - Diamond Plus"
            : payment_type === "elite_yearly"
            ? "Dimes Only World - Elite"
            : "Dancers Events Network",
        user_action: "PAY_NOW",
        landing_page: "LOGIN",
        locale: "en-US",
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
      console.error("PayPal order error status:", orderResponse.status);
      console.error("PayPal order error body:", errorText);
      throw new Error(
        `PayPal order creation failed (status ${orderResponse.status}): ${errorText}`
      );
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
          payment_type === "tip"
            ? `Tip for ${tipped_username}`
            : payment_type === "membership"
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
        error: error instanceof Error ? error.message : "Failed to create PayPal order",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
