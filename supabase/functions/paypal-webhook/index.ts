import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  console.log("=== PAYPAL WEBHOOK TRIGGERED ===");
  console.log("Request method:", req.method);
  console.log("Request URL:", req.url);
  console.log("User agent:", req.headers.get("user-agent"));

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("CORS preflight request handled");
    return new Response("ok", { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    console.log("Invalid method:", req.method);
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    console.log("=== WEBHOOK PROCESSING STARTED ===");

    // Create Supabase client with service role key (bypasses RLS and auth)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("Environment check:", {
      supabaseUrl: supabaseUrl ? "✓ Set" : "✗ Missing",
      serviceRoleKey: serviceRoleKey ? "✓ Set" : "✗ Missing",
    });

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing required environment variables");
      return new Response(JSON.stringify({ error: "Configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client with service role (bypasses authentication)
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log("Reading webhook body...");
    const webhook = await req.json();
    console.log("=== FULL WEBHOOK DATA ===");
    console.log(JSON.stringify(webhook, null, 2));
    console.log("=== END WEBHOOK DATA ===");

    console.log("PayPal webhook event type:", webhook.event_type);

    if (webhook.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      console.log("=== PROCESSING PAYMENT.CAPTURE.COMPLETED ===");

      // Extract order ID from webhook
      const paymentId =
        webhook.resource?.supplementary_data?.related_ids?.order_id;
      console.log("Extracted payment ID:", paymentId);

      if (!paymentId) {
        console.error("No order ID found in webhook");
        console.error("Available data:", {
          resource: !!webhook.resource,
          supplementary_data: !!webhook.resource?.supplementary_data,
          related_ids: !!webhook.resource?.supplementary_data?.related_ids,
        });
        return new Response(JSON.stringify({ error: "No order ID found" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update payment status in database
      console.log("Updating payment status to completed...");
      const { data: payment, error: updateError } = await supabaseClient
        .from("payments")
        .update({
          payment_status: "completed",
          paypal_payment_id: webhook.resource.id,
          updated_at: new Date().toISOString(),
        })
        .eq("paypal_order_id", paymentId)
        .select()
        .single();

      if (updateError) {
        console.error("Failed to update payment:", updateError);
        return new Response(
          JSON.stringify({
            error: "Payment update failed",
            details: updateError,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (!payment) {
        console.error("Payment not found for order ID:", paymentId);
        return new Response(JSON.stringify({ error: "Payment not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("Payment updated successfully:", payment);

      // Add user to event
      console.log("Adding user to event...");
      const { error: eventError } = await supabaseClient
        .from("user_events")
        .insert({
          user_id: payment.user_id,
          event_id: payment.event_id,
          payment_status: "paid",
          payment_id: payment.id,
          referred_by: payment.referred_by,
        });

      if (eventError) {
        console.error("Failed to add user to event:", eventError);
        // Don't return error, continue processing
      } else {
        console.log("User added to event successfully");
      }

      // Process commissions
      console.log("Processing commissions...");
      await processCommissions(supabaseClient, payment);

      console.log("Payment processed successfully:", paymentId);
    } else {
      console.log("=== UNHANDLED WEBHOOK EVENT ===");
      console.log("Event type:", webhook.event_type);
      console.log("Available event types we handle:", [
        "PAYMENT.CAPTURE.COMPLETED",
      ]);
    }

    console.log("=== WEBHOOK PROCESSING COMPLETED ===");
    return new Response(
      JSON.stringify({ success: true, message: "Webhook processed" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in paypal-webhook:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
        stack: error.stack,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function processCommissions(supabaseClient: any, payment: any) {
  const commissions = [];

  try {
    // Referrer commission (20%)
    if (payment.referred_by && payment.referrer_commission > 0) {
      const { data: referrer } = await supabaseClient
        .from("users")
        .select("id, paypal_email")
        .eq("username", payment.referred_by)
        .single();

      if (referrer?.paypal_email) {
        commissions.push({
          user_id: referrer.id,
          payment_id: payment.id,
          commission_type: "referrer",
          amount: payment.referrer_commission,
        });
      }
    }

    // Event host commission (10%)
    if (payment.event_host_commission > 0) {
      const { data: event } = await supabaseClient
        .from("events")
        .select("host_user_id")
        .eq("id", payment.event_id)
        .single();

      if (event?.host_user_id) {
        commissions.push({
          user_id: event.host_user_id,
          payment_id: payment.id,
          commission_type: "event_host",
          amount: payment.event_host_commission,
        });
      }
    }

    // Insert commission records
    if (commissions.length > 0) {
      const { error: commissionError } = await supabaseClient
        .from("commission_payouts")
        .insert(commissions);

      if (commissionError) {
        console.error("Failed to create commission records:", commissionError);
      } else {
        console.log("Commission records created:", commissions.length);
      }
    }
  } catch (error) {
    console.error("Error processing commissions:", error);
  }
}
