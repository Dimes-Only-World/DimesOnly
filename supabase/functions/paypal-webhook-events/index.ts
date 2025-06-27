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
    const webhookBody = await req.json();
    console.log(
      "PayPal webhook received:",
      JSON.stringify(webhookBody, null, 2)
    );

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Only process CHECKOUT.ORDER.APPROVED and PAYMENT.CAPTURE.COMPLETED events
    if (
      webhookBody.event_type === "CHECKOUT.ORDER.APPROVED" ||
      webhookBody.event_type === "PAYMENT.CAPTURE.COMPLETED"
    ) {
      const orderId =
        webhookBody.resource?.id ||
        webhookBody.resource?.supplementary_data?.related_ids?.order_id;

      if (!orderId) {
        console.error("No order ID found in webhook");
        return new Response("No order ID found", { status: 400 });
      }

      console.log("Processing order:", orderId);

      // Find the payment record
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .select("*")
        .eq("paypal_order_id", orderId)
        .single();

      if (paymentError || !payment) {
        console.error("Payment not found:", paymentError);
        return new Response("Payment not found", { status: 404 });
      }

      console.log("Found payment:", payment.id);

      // Calculate commission amounts
      const totalAmount = payment.amount;
      const referrerAmount = payment.referred_by ? totalAmount * 0.2 : 0; // 20%
      const hostAmount = totalAmount * 0.1; // 10%

      // Update payment status with commission amounts
      const { error: updateError } = await supabase
        .from("payments")
        .update({
          payment_status: "completed",
          paypal_payment_id: webhookBody.resource?.id,
          referrer_commission: referrerAmount,
          event_host_commission: hostAmount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      if (updateError) {
        console.error("Failed to update payment:", updateError);
        return new Response("Failed to update payment", { status: 500 });
      }

      // Get user details
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("username")
        .eq("id", payment.user_id)
        .single();

      if (userError || !user) {
        console.error("User not found:", userError);
        return new Response("User not found", { status: 404 });
      }

      // Add user to event
      const { error: eventError } = await supabase.from("user_events").insert({
        user_id: payment.user_id,
        event_id: payment.event_id,
        username: user.username,
        payment_status: "paid",
        payment_id: payment.id,
        referred_by: payment.referred_by,
        guest_name: payment.guest_name || null, // Use guest_name from payment record
      });

      if (eventError) {
        console.error("Failed to add user to event:", eventError);
        // Don't return error here, payment is still processed
      }

      // Process referral payouts if there's a referrer
      if (payment.referred_by && referrerAmount > 0) {
        console.log("Processing referral payout for:", payment.referred_by);
        console.log(
          "Referrer amount:",
          referrerAmount,
          "Host amount:",
          hostAmount
        );

        // Update referrer earnings
        const { error: referrerError } = await supabase
          .from("users")
          .update({
            total_earnings: supabase.raw(
              `COALESCE(total_earnings, 0) + ${referrerAmount}`
            ),
            pending_earnings: supabase.raw(
              `COALESCE(pending_earnings, 0) + ${referrerAmount}`
            ),
          })
          .eq("username", payment.referred_by);

        if (referrerError) {
          console.error("Failed to update referrer earnings:", referrerError);
        }

        // Get event details to find the host/performer
        const { data: event, error: eventError } = await supabase
          .from("events")
          .select("created_by")
          .eq("id", payment.event_id)
          .single();

        if (event && event.created_by) {
          // Update host/performer earnings
          const { error: hostError } = await supabase
            .from("users")
            .update({
              total_earnings: supabase.raw(
                `COALESCE(total_earnings, 0) + ${hostAmount}`
              ),
              pending_earnings: supabase.raw(
                `COALESCE(pending_earnings, 0) + ${hostAmount}`
              ),
            })
            .eq("id", event.created_by);

          if (hostError) {
            console.error("Failed to update host earnings:", hostError);
          }
        }

        // Create earnings records for tracking
        const earningsRecords = [
          {
            user_id: payment.referred_by,
            amount: referrerAmount,
            source: "referral",
            description: `Referral commission from event ticket sale`,
            payment_id: payment.id,
          },
        ];

        if (event && event.created_by) {
          earningsRecords.push({
            user_id: event.created_by,
            amount: hostAmount,
            source: "event_hosting",
            description: `Host commission from event ticket sale`,
            payment_id: payment.id,
          });
        }

        const { error: earningsError } = await supabase
          .from("earnings")
          .insert(earningsRecords);

        if (earningsError) {
          console.error("Failed to create earnings records:", earningsError);
        }

        console.log("Referral payouts processed successfully");
      }

      console.log("Payment processing completed successfully");
    }

    return new Response("OK", {
      headers: corsHeaders,
      status: 200,
    });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
