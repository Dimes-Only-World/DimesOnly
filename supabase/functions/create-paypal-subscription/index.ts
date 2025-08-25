import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("create-paypal-subscription body:", body);

    const paypalClientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const paypalClientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    const paypalEnvironment = Deno.env.get("PAYPAL_ENVIRONMENT") || "sandbox";
    // Plan IDs by tier and cadence (support prefixed and legacy names)
    const silverMonthly = Deno.env.get("PAYPAL_SILVER_MONTHLY_PLAN_ID") || Deno.env.get("SILVER_MONTHLY_PLAN_ID");
    const silverYearly  = Deno.env.get("PAYPAL_SILVER_YEARLY_PLAN_ID")  || Deno.env.get("SILVER_YEARLY_PLAN_ID");
    const goldMonthly   = Deno.env.get("PAYPAL_GOLD_MONTHLY_PLAN_ID")   || Deno.env.get("GOLD_MONTHLY_PLAN_ID");
    const goldYearly    = Deno.env.get("PAYPAL_GOLD_YEARLY_PLAN_ID")    || Deno.env.get("GOLD_YEARLY_PLAN_ID");
    const diamondMonthly= Deno.env.get("PAYPAL_DIAMOND_MONTHLY_PLAN_ID")|| Deno.env.get("DIAMOND_MONTHLY_PLAN_ID");
    // Diamond yearly options: Full (once per year) or Split every 4 months (3 cycles)
    const diamondYearlySplit = Deno.env.get("PAYPAL_DIAMOND_YEARLY_SPLIT_PLAN_ID") || Deno.env.get("DIAMOND_YEARLY_SPLIT_PLAN_ID");
    const diamondYearlyFull  = Deno.env.get("PAYPAL_DIAMOND_YEARLY_FULL_PLAN_ID")  || Deno.env.get("DIAMOND_YEARLY_FULL_PLAN_ID");
    // Elite monthly (yearly handled by one-time order path)
    const eliteMonthly = Deno.env.get("PAYPAL_ELITE_MONTHLY_PLAN_ID") || Deno.env.get("ELITE_MONTHLY_PLAN_ID");

    if (!paypalClientId || !paypalClientSecret) {
      throw new Error("Missing PayPal credentials");
    }

    const tier = (body?.tier || "gold").toString(); // silver | gold | diamond | elite
    const cadence = (body?.cadence || body?.plan_mode || "monthly").toString(); // monthly | yearly
    const billingOption = (body?.billing_option || "").toString(); // for diamond yearly: 'full' | 'split'
    let planId: string | undefined;
    if (tier === "silver") {
      planId = cadence === "yearly" ? silverYearly : silverMonthly;
    } else if (tier === "gold") {
      planId = cadence === "yearly" ? goldYearly : goldMonthly;
    } else if (tier === "diamond") {
      if (cadence === "yearly") {
        planId = billingOption === "full" ? diamondYearlyFull : diamondYearlySplit; // default to split if not specified
      } else {
        planId = diamondMonthly;
      }
    } else if (tier === "elite") {
      if (cadence !== "monthly") {
        return new Response(
          JSON.stringify({ success: false, error: "Elite yearly is not a subscription. Use one-time order path." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
        );
      }
      planId = eliteMonthly;
    } else {
      return new Response(
        JSON.stringify({ success: false, error: `Unsupported tier '${tier}'` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }
    if (!planId) {
      let which = "";
      if (tier === "silver") which = cadence === "yearly" ? "PAYPAL_SILVER_YEARLY_PLAN_ID/SILVER_YEARLY_PLAN_ID" : "PAYPAL_SILVER_MONTHLY_PLAN_ID/SILVER_MONTHLY_PLAN_ID";
      else if (tier === "gold") which = cadence === "yearly" ? "PAYPAL_GOLD_YEARLY_PLAN_ID/GOLD_YEARLY_PLAN_ID" : "PAYPAL_GOLD_MONTHLY_PLAN_ID/GOLD_MONTHLY_PLAN_ID";
      else if (tier === "diamond") {
        if (cadence === "yearly") {
          which = billingOption === "full" ? "PAYPAL_DIAMOND_YEARLY_FULL_PLAN_ID/DIAMOND_YEARLY_FULL_PLAN_ID" : "PAYPAL_DIAMOND_YEARLY_SPLIT_PLAN_ID/DIAMOND_YEARLY_SPLIT_PLAN_ID";
        } else {
          which = "PAYPAL_DIAMOND_MONTHLY_PLAN_ID/DIAMOND_MONTHLY_PLAN_ID";
        }
      } else if (tier === "elite") {
        which = "PAYPAL_ELITE_MONTHLY_PLAN_ID/ELITE_MONTHLY_PLAN_ID";
      }
      return new Response(
        JSON.stringify({ success: false, error: `${which} is not set in Supabase Function secrets` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    const returnUrl = body.return_url;
    const cancelUrl = body.cancel_url;

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

    // Preflight: verify plan exists and is ACTIVE in the selected environment
    try {
      const planCheckResp = await fetch(`${PAYPAL_BASE_URL}/v1/billing/plans/${planId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!planCheckResp.ok) {
        const planErr = await planCheckResp.text();
        return new Response(
          JSON.stringify({
            success: false,
            error: `Invalid PayPal plan_id '${planId}' for environment '${paypalEnvironment}'. Plan lookup failed: ${planErr}`,
            debug: { tier, cadence, billing_option: billingOption },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
        );
      }

      const planJson: any = await planCheckResp.json();
      if (planJson?.status && planJson.status !== "ACTIVE") {
        return new Response(
          JSON.stringify({
            success: false,
            error: `PayPal plan '${planId}' is not ACTIVE (status: ${planJson.status}). Activate the plan or use a different one.`,
            debug: { tier, cadence, billing_option: billingOption },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
        );
      }
    } catch (pfErr) {
      console.error("Plan preflight error:", pfErr);
      return new Response(
        JSON.stringify({ success: false, error: `Plan preflight failed: ${pfErr}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    // Create subscription
    const subPayload: any = {
      plan_id: planId,
      application_context: {
        return_url: returnUrl,
        cancel_url: cancelUrl,
        user_action: "SUBSCRIBE_NOW",
        brand_name: `Dimes Only World - ${tier[0].toUpperCase()}${tier.slice(1)} (${cadence}${tier==='diamond' && cadence==='yearly' ? `/${billingOption || 'split'}` : ''})`,
      },
    };

    // Optional custom_context for tracking
    if (body?.user_id) {
      const opt = billingOption ? `_${billingOption}` : "";
      subPayload.custom_id = `${tier}_${cadence}${opt}_user_${body.user_id}`;
    }

    const createSubResp = await fetch(`${PAYPAL_BASE_URL}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subPayload),
    });

    if (!createSubResp.ok) {
      const errText = await createSubResp.text();
      console.error("PayPal subscription create error:", errText);
      return new Response(
        JSON.stringify({
          success: false,
          error: `PayPal subscription creation failed: ${errText}`,
          debug: { plan_id: planId, environment: paypalEnvironment, tier, cadence, billing_option: billingOption },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    const sub = await createSubResp.json();
    const approvalUrl = (sub?.links || []).find((l: any) => l.rel === "approve")?.href;
    if (!approvalUrl) {
      throw new Error("No approval URL returned by PayPal");
    }

    return new Response(
      JSON.stringify({ success: true, approval_url: approvalUrl, subscription_id: sub?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("create-paypal-subscription error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
    );
  }
});
