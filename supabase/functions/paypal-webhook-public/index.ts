import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  console.log("=== PUBLIC WEBHOOK TRIGGERED ===");
  console.log("Request method:", req.method);
  console.log("Request URL:", req.url);
  console.log("Request headers:", Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("CORS preflight request handled");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("=== WEBHOOK PROCESSING STARTED ===");

    // Create Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("Environment check:", {
      supabaseUrl: supabaseUrl ? "✓ Set" : "✗ Missing",
      serviceRoleKey: serviceRoleKey ? "✓ Set" : "✗ Missing",
    });

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing required environment variables");
      return new Response("Configuration error", { status: 500 });
    }

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
        return new Response("No order ID", { status: 400 });
      }

      // Update payment status
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
        return new Response("Payment update failed", { status: 500 });
      }

      if (!payment) {
        console.error("Payment not found for order ID:", paymentId);
        return new Response("Payment not found", { status: 404 });
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
      } else {
        console.log("User added to event successfully");
      }

      console.log("Payment processed successfully:", paymentId);
    } else {
      console.log("=== UNHANDLED WEBHOOK EVENT ===");
      console.log("Event type:", webhook.event_type);
    }

    console.log("=== WEBHOOK PROCESSING COMPLETED ===");
    return new Response("OK", { headers: corsHeaders });
  } catch (error) {
    console.error("Error in paypal-webhook:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
