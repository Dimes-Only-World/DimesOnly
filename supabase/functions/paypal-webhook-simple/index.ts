// Simple PayPal webhook handler
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  // Log everything for debugging
  console.log("🚀 WEBHOOK CALLED");
  console.log("Method:", req.method);
  console.log("Headers:", Object.fromEntries(req.headers.entries()));

  // Handle any method
  if (req.method === "OPTIONS") {
    return new Response("OK", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  try {
    const body = await req.text();
    console.log("📦 Raw body:", body);

    let webhook;
    try {
      webhook = JSON.parse(body);
    } catch (e) {
      console.log("❌ Failed to parse JSON:", e);
      webhook = { raw_body: body };
    }

    console.log("📋 Parsed webhook:", JSON.stringify(webhook, null, 2));

    // Simple success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Webhook received",
        event_type: webhook.event_type || "unknown",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("💥 Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
