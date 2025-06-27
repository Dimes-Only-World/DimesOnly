import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    console.log("=== TESTING WEBHOOK TRIGGER ===");

    // Test webhook payload - simulating PayPal webhook
    const testWebhookPayload = {
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: {
        id: "test-payment-id",
        supplementary_data: {
          related_ids: {
            order_id: "22W492983A6337936", // Use the actual order ID from your database
          },
        },
      },
      summary: "Payment completed for test order",
    };

    console.log("Sending test webhook to paypal-webhook function...");

    // Call the webhook function
    const webhookResponse = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/paypal-webhook`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify(testWebhookPayload),
      }
    );

    const webhookResult = await webhookResponse.text();

    console.log("Webhook response status:", webhookResponse.status);
    console.log("Webhook response:", webhookResult);

    return new Response(
      JSON.stringify({
        success: true,
        webhookStatus: webhookResponse.status,
        webhookResponse: webhookResult,
        testPayload: testWebhookPayload,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Test webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
