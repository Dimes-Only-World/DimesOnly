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
    const requestBody = await req.json();
    console.log("Diamond Plus payment request received:", requestBody);

    // Environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const paypalClientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const paypalClientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    const paypalEnvironment = Deno.env.get("PAYPAL_ENVIRONMENT") || "sandbox";

    // Required fields
    const {
      membership_upgrade_id,
      user_id,
      amount,
      installment_number = 1,
      return_url,
      cancel_url,
    } = requestBody;

    if (
      !membership_upgrade_id ||
      !user_id ||
      !amount ||
      !return_url ||
      !cancel_url
    ) {
      throw new Error(
        "Missing required fields: membership_upgrade_id, user_id, amount, return_url, cancel_url"
      );
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch membership upgrade details
    const { data: upgrade, error: upgradeError } = await supabase
      .from("membership_upgrades")
      .select("*")
      .eq("id", membership_upgrade_id)
      .eq("user_id", user_id)
      .single();

    if (upgradeError || !upgrade) {
      throw new Error(`Membership upgrade not found: ${upgradeError?.message}`);
    }

    // Verify user eligibility
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("user_type, diamond_plus_active")
      .eq("id", user_id)
      .single();

    if (userError || !user) {
      throw new Error(`User not found: ${userError?.message}`);
    }

    if (user.diamond_plus_active) {
      throw new Error("User already has Diamond Plus membership");
    }

    if (user.user_type !== "stripper" && user.user_type !== "exotic") {
      throw new Error("User is not eligible for Diamond Plus membership");
    }

    console.log("=== Diamond Plus Payment Creation ===");
    console.log("Upgrade details:", {
      id: upgrade.id,
      upgrade_type: upgrade.upgrade_type,
      payment_amount: upgrade.payment_amount,
      installment_plan: upgrade.installment_plan,
      installment_number,
      amount,
    });

    // PayPal API setup
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

    // Prepare order description
    const isInstallment = upgrade.installment_plan && installment_number > 1;
    const orderDescription = isInstallment
      ? `Diamond Plus Membership - Installment ${installment_number}/2`
      : "Diamond Plus Membership - Full Payment ($349)";

    // Create PayPal order
    const orderData = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: membership_upgrade_id,
          description: orderDescription,
          amount: {
            currency_code: "USD",
            value: amount.toFixed(2),
          },
          custom_id: `diamond_plus_${membership_upgrade_id}_user_${user_id}_installment_${installment_number}`,
        },
      ],
      application_context: {
        return_url: return_url,
        cancel_url: cancel_url,
        brand_name: "Dimes Only World - Diamond Plus",
        user_action: "PAY_NOW",
        landing_page: "BILLING",
        payment_method: {
          payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED",
        },
      },
    };

    console.log("Creating PayPal order:", {
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
      console.error("PayPal order creation failed:", errorText);
      throw new Error(`PayPal order creation failed: ${errorText}`);
    }

    const order = await orderResponse.json();
    console.log("PayPal order created successfully:", {
      id: order.id,
      status: order.status,
    });

    // Find approval URL
    const approvalUrl = order.links?.find(
      (link: any) => link.rel === "approve"
    )?.href;

    if (!approvalUrl) {
      throw new Error("No approval URL found in PayPal response");
    }

    // Update membership upgrade record
    const { error: updateError } = await supabase
      .from("membership_upgrades")
      .update({
        paypal_order_id: order.id,
        status: "pending_payment",
        updated_at: new Date().toISOString(),
      })
      .eq("id", membership_upgrade_id);

    if (updateError) {
      console.error("Failed to update membership upgrade:", updateError);
      // Don't throw error here, as PayPal order was created successfully
    }

    // Create installment payment record if needed
    if (upgrade.installment_plan) {
      const installmentData = {
        membership_upgrade_id: membership_upgrade_id,
        installment_number: installment_number,
        amount: amount,
        due_date: new Date().toISOString(),
        paypal_order_id: order.id,
        status: "pending",
      };

      const { error: installmentError } = await supabase
        .from("installment_payments")
        .insert(installmentData);

      if (installmentError) {
        console.error(
          "Failed to create installment payment record:",
          installmentError
        );
        // Don't throw error here, as PayPal order was created successfully
      }
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        approval_url: approvalUrl,
        amount: amount,
        description: orderDescription,
        installment_number: installment_number,
        total_installments: upgrade.installment_plan ? 2 : 1,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Diamond Plus payment creation error:", error);

    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
