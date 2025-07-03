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
    const webhookBody = await req.json();
    console.log("Diamond Plus webhook received:", webhookBody);

    // Environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const paypalClientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const paypalClientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    const paypalEnvironment = Deno.env.get("PAYPAL_ENVIRONMENT") || "sandbox";

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Handle PayPal webhook events
    const eventType = webhookBody.event_type;
    const orderId = webhookBody.resource?.id;

    console.log("Processing webhook event:", { eventType, orderId });

    if (
      eventType === "CHECKOUT.ORDER.APPROVED" ||
      eventType === "PAYMENT.CAPTURE.COMPLETED"
    ) {
      // Find the membership upgrade by PayPal order ID
      const { data: upgrade, error: upgradeError } = await supabase
        .from("membership_upgrades")
        .select("*")
        .eq("paypal_order_id", orderId)
        .single();

      if (upgradeError || !upgrade) {
        console.log("No membership upgrade found for order:", orderId);
        return new Response("Order not found", { status: 404 });
      }

      console.log("Found membership upgrade:", upgrade.id);

      // Capture the PayPal payment if approved
      if (eventType === "CHECKOUT.ORDER.APPROVED") {
        const PAYPAL_BASE_URL =
          paypalEnvironment === "production"
            ? "https://api-m.paypal.com"
            : "https://api-m.sandbox.paypal.com";

        // Get PayPal access token
        const auth = btoa(`${paypalClientId}:${paypalClientSecret}`);
        const tokenResponse = await fetch(
          `${PAYPAL_BASE_URL}/v1/oauth2/token`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${auth}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "grant_type=client_credentials",
          }
        );

        const { access_token } = await tokenResponse.json();

        // Capture the payment
        const captureResponse = await fetch(
          `${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${access_token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!captureResponse.ok) {
          throw new Error("Failed to capture PayPal payment");
        }

        const captureData = await captureResponse.json();
        console.log("Payment captured:", captureData.id);
      }

      // Update installment payment if applicable
      if (upgrade.installment_plan) {
        const { error: installmentUpdateError } = await supabase
          .from("installment_payments")
          .update({
            payment_status: "completed",
            paid_at: new Date().toISOString(),
            paypal_payment_id: webhookBody.resource?.id,
          })
          .eq("paypal_order_id", orderId);

        if (installmentUpdateError) {
          console.error(
            "Failed to update installment payment:",
            installmentUpdateError
          );
        }

        // Check if all installments are paid
        const { data: installments, error: installmentsError } = await supabase
          .from("installment_payments")
          .select("payment_status")
          .eq("membership_upgrade_id", upgrade.id);

        if (!installmentsError && installments) {
          const allPaid = installments.every(
            (inst) => inst.payment_status === "completed"
          );

          if (allPaid) {
            // Activate Diamond Plus membership
            await activateDiamondPlus(supabase, upgrade);
          } else {
            // Mark upgrade as partially paid
            await supabase
              .from("membership_upgrades")
              .update({
                payment_status: "partially_paid",
                updated_at: new Date().toISOString(),
              })
              .eq("id", upgrade.id);
          }
        }
      } else {
        // Full payment - activate immediately
        await activateDiamondPlus(supabase, upgrade);
      }

      return new Response("Webhook processed successfully", { status: 200 });
    }

    return new Response("Event type not handled", { status: 200 });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response("Webhook error", { status: 500 });
  }
});

async function activateDiamondPlus(supabase: any, upgrade: any) {
  console.log("Activating Diamond Plus for user:", upgrade.user_id);

  try {
    // Update user to Diamond Plus
    const { error: userUpdateError } = await supabase
      .from("users")
      .update({
        membership_tier: "diamond_plus",
        diamond_plus_active: true,
        agreement_signed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", upgrade.user_id);

    if (userUpdateError) {
      throw new Error(`Failed to update user: ${userUpdateError.message}`);
    }

    // Mark upgrade as completed
    const { error: upgradeUpdateError } = await supabase
      .from("membership_upgrades")
      .update({
        payment_status: "completed",
        upgrade_status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", upgrade.id);

    if (upgradeUpdateError) {
      throw new Error(
        `Failed to update upgrade: ${upgradeUpdateError.message}`
      );
    }

    // Update membership limits - increment current_count for the user's type
    const userType = upgrade.user_type || "stripper";
    const { error: limitsError } = await supabase.rpc(
      "increment_membership_count",
      {
        membership_type_param: "diamond_plus",
        user_type_param: userType,
      }
    );

    if (limitsError) {
      console.error("RPC failed, trying direct update:", limitsError);
      // Fallback to direct update if RPC doesn't exist
      const { error: fallbackError } = await supabase
        .from("membership_limits")
        .update({
          current_count: supabase.raw("current_count + 1"),
          updated_at: new Date().toISOString(),
        })
        .eq("membership_type", "diamond_plus")
        .eq("user_type", userType);

      if (fallbackError) {
        console.error("Failed to update membership limits:", fallbackError);
      }
    }

    // Create quarterly requirements tracking
    const currentYear = new Date().getFullYear();
    const quarters = [
      {
        quarter: 1,
        start_date: `${currentYear}-01-01`,
        end_date: `${currentYear}-03-31`,
      },
      {
        quarter: 2,
        start_date: `${currentYear}-04-01`,
        end_date: `${currentYear}-06-30`,
      },
      {
        quarter: 3,
        start_date: `${currentYear}-07-01`,
        end_date: `${currentYear}-09-30`,
      },
      {
        quarter: 4,
        start_date: `${currentYear}-10-01`,
        end_date: `${currentYear}-12-31`,
      },
    ];

    for (const q of quarters) {
      await supabase.from("quarterly_requirements").insert({
        user_id: upgrade.user_id,
        year: currentYear,
        quarter: q.quarter,
        start_date: q.start_date,
        end_date: q.end_date,
        weekly_referrals_required: 7,
        weekly_content_required: 7,
        events_required: 1,
        weekly_messages_required: 7,
        guaranteed_payout: 6250.0,
      });
    }

    console.log("Diamond Plus activation completed successfully");
  } catch (error) {
    console.error("Error activating Diamond Plus:", error);
    throw error;
  }
}
