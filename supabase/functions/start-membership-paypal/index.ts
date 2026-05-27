import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const paypalClientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const paypalClientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    const paypalEnvironment = Deno.env.get("PAYPAL_ENVIRONMENT") || "sandbox";

    if (!paypalClientId || !paypalClientSecret) {
      return new Response(
        JSON.stringify({ success: false, error: "PayPal credentials not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Parse request body
    const body = await req.json();
    const {
      tier,
      amount,
      phone_number,
      payment_method, // 'paypal_full' | 'paypal_paylater'
      cadence,
      billing_option,
      return_url,
      cancel_url,
      check_availability,
    } = body;

    console.log("start-membership-paypal called with:", { tier, amount, payment_method, cadence });

    // Validate required fields
    if (!tier || !amount || !phone_number || !payment_method) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: tier, amount, phone_number, payment_method" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Authenticate user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Authentication required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Create client with user's auth to verify token
    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      console.error("JWT verification failed:", claimsError);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired authentication token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const userId = claimsData.claims.sub as string;
    console.log("Authenticated user:", userId);

    // Create service role client for privileged operations
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check availability for silver_plus if needed
    if (check_availability && tier === "silver_plus") {
      const { data: availability, error: availError } = await supabase.rpc("check_silver_plus_availability");
      if (availError) {
        console.error("Availability check failed:", availError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to check availability" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      if (!availability || !availability[0]?.available) {
        return new Response(
          JSON.stringify({ success: false, error: "No more lifetime Silver+ memberships available", code: "SOLD_OUT" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 }
        );
      }
    }

    // Update user's phone number
    const { error: phoneError } = await supabase
      .from("users")
      .update({ phone_number })
      .eq("id", userId);

    if (phoneError) {
      console.warn("Failed to update phone number:", phoneError);
    }

    // Create membership upgrade record (service role bypasses RLS)
    const { data: upgrade, error: upgradeError } = await supabase
      .from("membership_upgrades")
      .insert({
        user_id: userId,
        upgrade_type: tier,
        payment_amount: amount,
        payment_method: payment_method,
        installment_plan: false,
        installment_count: 1,
        phone_number: phone_number,
        payment_status: "pending",
        upgrade_status: "pending",
      })
      .select()
      .single();

    if (upgradeError) {
      console.error("Failed to create membership upgrade:", upgradeError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create membership record" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log("Created membership upgrade:", upgrade.id);

    // Build description based on tier
    const tierDescriptions: Record<string, string> = {
      silver: "Silver Membership - One-time Payment",
      silver_plus: "Silver+ Lifetime Membership - One-time Payment",
      gold: cadence === "yearly" ? "Gold Membership - Yearly" : "Gold Membership - Monthly",
      diamond: cadence === "yearly" ? "Diamond Membership - Yearly" : "Diamond Membership - Monthly",
      elite: "Elite Membership - Lifetime",
      business_owner_elite: "Business Owner Elite - Lifetime ($15,000)",
      business_owner_elite_installment: "Business Owner Elite - 12-Month Plan (First Payment)",
    };
    const description = tierDescriptions[tier] || `${tier} Membership`;

    // Get PayPal access token
    const PAYPAL_BASE_URL = paypalEnvironment === "production" || paypalEnvironment === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

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
        JSON.stringify({ success: false, error: "Failed to authenticate with PayPal" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const { access_token } = await tokenResponse.json();
    console.log("PayPal access token obtained");

    // Create PayPal order
    const customId = `membership_${upgrade.id}_user_${userId}_${tier}`;
    const orderData = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: upgrade.id,
          description: description,
          amount: {
            currency_code: "USD",
            value: Number(amount).toFixed(2),
          },
          custom_id: customId,
        },
      ],
      application_context: {
        return_url: return_url,
        cancel_url: cancel_url,
        brand_name: "Dimes Only World",
        user_action: "PAY_NOW",
        // Use BILLING landing page for card payments to show guest checkout
        landing_page: payment_method === "paypal_card" ? "BILLING" : "LOGIN",
        locale: "en-US",
        payment_method: {
          payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED",
        },
      },
    };

    console.log("Creating PayPal order:", { amount, tier, upgrade_id: upgrade.id });

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
      
      // Clean up the upgrade record on failure
      await supabase.from("membership_upgrades").delete().eq("id", upgrade.id);
      
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create PayPal order" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const order = await orderResponse.json();
    console.log("PayPal order created:", order.id);

    // Find approval URL
    const approvalUrl = order.links?.find((link: any) => link.rel === "approve")?.href;
    if (!approvalUrl) {
      await supabase.from("membership_upgrades").delete().eq("id", upgrade.id);
      return new Response(
        JSON.stringify({ success: false, error: "No approval URL in PayPal response" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Update upgrade record with PayPal order ID
    const { error: updateError } = await supabase
      .from("membership_upgrades")
      .update({
        paypal_order_id: order.id,
        payment_status: "pending_payment",
      })
      .eq("id", upgrade.id);

    if (updateError) {
      console.error("Failed to update upgrade with order ID:", updateError);
    }

    // Log environment info for debugging
    const isSandbox = PAYPAL_BASE_URL.includes("sandbox");
    console.log("=== Membership PayPal order ready ===", {
      upgrade_id: upgrade.id,
      order_id: order.id,
      tier,
      amount,
      paypal_environment: paypalEnvironment,
      paypal_base_url: PAYPAL_BASE_URL,
      is_sandbox: isSandbox,
      approval_url_domain: approvalUrl.includes("sandbox") ? "sandbox.paypal.com" : "paypal.com",
    });

    return new Response(
      JSON.stringify({
        success: true,
        upgrade_id: upgrade.id,
        order_id: order.id,
        approval_url: approvalUrl,
        amount,
        tier,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("start-membership-paypal error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to start membership payment",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
