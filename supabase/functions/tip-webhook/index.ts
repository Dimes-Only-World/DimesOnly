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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    console.log("Tip webhook received:", body);

    // Parse the PayPal webhook event
    const { event_type, resource } = body;

    if (event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const paypalOrderId = resource.id;
      const amount = parseFloat(resource.amount.value);
      const customData = JSON.parse(resource.custom_id || "{}");

      const {
        tipped_username,
        referrer_username,
        tipper_username,
        tip_amount,
      } = customData;

      console.log("Processing tip payment:", {
        paypalOrderId,
        amount,
        tipped_username,
        referrer_username,
        tipper_username,
        tip_amount,
      });

      // Get user IDs
      const { data: tippedUser, error: tippedUserError } = await supabaseClient
        .from("users")
        .select("id")
        .eq("username", tipped_username)
        .single();

      if (tippedUserError) {
        console.error("Error finding tipped user:", tippedUserError);
        throw new Error("Tipped user not found");
      }

      const { data: tipperUser, error: tipperUserError } = await supabaseClient
        .from("users")
        .select("id")
        .eq("username", tipper_username)
        .single();

      if (tipperUserError) {
        console.error("Error finding tipper user:", tipperUserError);
        throw new Error("Tipper user not found");
      }

      // Create payment record
      const { data: payment, error: paymentError } = await supabaseClient
        .from("payments")
        .insert({
          user_id: tipperUser.id,
          amount: amount,
          payment_status: "completed",
          payment_type: "tip",
          paypal_order_id: paypalOrderId,
          referred_by: referrer_username || null,
        })
        .select()
        .single();

      if (paymentError) {
        console.error("Error creating payment:", paymentError);
        throw new Error("Failed to create payment record");
      }

      // Calculate referrer commission (20%)
      const referrerCommission = referrer_username ? amount * 0.2 : 0;

      // Create tip transaction
      const { data: tipTransaction, error: tipError } = await supabaseClient
        .from("tips_transactions")
        .insert({
          tipper_user_id: tipperUser.id,
          tipped_username: tipped_username,
          tipped_user_id: tippedUser.id,
          tip_amount: amount,
          payment_method: "paypal",
          payment_id: payment.id,
          payment_status: "completed",
          paypal_order_id: paypalOrderId,
          referrer_username: referrer_username || null,
          referrer_commission: referrerCommission,
          tickets_generated: Math.floor(amount), // 1 ticket per dollar
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (tipError) {
        console.error("Error creating tip transaction:", tipError);
        throw new Error("Failed to create tip transaction");
      }

      // Create jackpot tickets
      const tickets = [];
      for (let i = 0; i < Math.floor(amount); i++) {
        tickets.push({
          user_id: tipperUser.id,
          tickets_count: 1,
          draw_date: getNextDrawDate(),
          created_at: new Date().toISOString(),
          source: "tip",
          source_transaction_id: tipTransaction.id,
        });
      }

      if (tickets.length > 0) {
        const { error: ticketsError } = await supabaseClient
          .from("jackpot_tickets")
          .insert(tickets);

        if (ticketsError) {
          console.error("Error creating jackpot tickets:", ticketsError);
          // Don't throw error here, tip is still valid
        }
      }

      // Add referrer commission if applicable
      if (referrer_username && referrerCommission > 0) {
        const { data: referrerUser } = await supabaseClient
          .from("users")
          .select("id")
          .eq("username", referrer_username)
          .single();

        if (referrerUser) {
          const { error: commissionError } = await supabaseClient
            .from("commission_payouts")
            .insert({
              user_id: referrerUser.id,
              amount: referrerCommission,
              commission_type: "tip_referral",
              payout_status: "pending",
              source_payment_id: payment.id,
            });

          if (commissionError) {
            console.error(
              "Error creating referrer commission:",
              commissionError
            );
          }
        }
      }

      console.log("Tip processing completed successfully");

      return new Response(
        JSON.stringify({
          success: true,
          message: "Tip processed successfully",
          tip_transaction_id: tipTransaction.id,
          tickets_generated: Math.floor(amount),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    return new Response(JSON.stringify({ message: "Event type not handled" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

function getNextDrawDate(): string {
  const now = new Date();
  const nextDraw = new Date(now);

  // Set to next Sunday at 9 PM
  const daysUntilSunday = (7 - now.getDay()) % 7;
  nextDraw.setDate(
    now.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday)
  );
  nextDraw.setHours(21, 0, 0, 0);

  return nextDraw.toISOString();
}
