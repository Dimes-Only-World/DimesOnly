// Simple PayPal webhook handler with signature verification
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "*",
  "Access-Control-Allow-Headers": "*",
};

// --- PayPal verification helpers ---
function getPayPalBaseUrl() {
  const env = (Deno.env.get("PAYPAL_ENVIRONMENT") || "sandbox").toLowerCase();
  return env === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Missing PayPal client credentials");
  const base = getPayPalBaseUrl();
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": "Basic " + btoa(`${clientId}:${clientSecret}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal token error: ${res.status}`);
  const data = await res.json();
  return data.access_token as string;
}

async function verifyPayPalWebhook(headers: Headers, rawBody: string): Promise<boolean> {
  const webhookId = Deno.env.get("PAYPAL_WEBHOOK_ID");
  if (!webhookId) {
    console.warn("PAYPAL_WEBHOOK_ID missing; skipping verification (treating as VERIFIED in non-prod)");
    const env = (Deno.env.get("PAYPAL_ENVIRONMENT") || "sandbox").toLowerCase();
    // In live without WEBHOOK_ID, fail closed
    if (env === "live") return false;
    return true;
  }

  const authAlgo = headers.get("paypal-auth-algo") || headers.get("PayPal-Auth-Algo") || "";
  const certUrl = headers.get("paypal-cert-url") || headers.get("PayPal-Cert-Url") || "";
  const transmissionId = headers.get("paypal-transmission-id") || headers.get("PayPal-Transmission-Id") || "";
  const transmissionSig = headers.get("paypal-transmission-sig") || headers.get("PayPal-Transmission-Sig") || "";
  const transmissionTime = headers.get("paypal-transmission-time") || headers.get("PayPal-Transmission-Time") || "";

  if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
    console.error("Missing PayPal verification headers");
    return false;
  }

  const token = await getPayPalAccessToken();
  const base = getPayPalBaseUrl();

  const payload = {
    auth_algo: authAlgo,
    cert_url: certUrl,
    transmission_id: transmissionId,
    transmission_sig: transmissionSig,
    transmission_time: transmissionTime,
    webhook_id: webhookId,
    webhook_event: JSON.parse(rawBody),
  };

  const res = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error("verify-webhook-signature HTTP error", res.status);
    return false;
  }
  const data = await res.json();
  const status = (data.verification_status || "").toUpperCase();
  console.log("PayPal verification_status:", status);
  return status === "SUCCESS" || status === "VERIFIED";
}

serve(async (req) => {
  // Log everything for debugging
  console.log("🚀 WEBHOOK CALLED");
  console.log("Method:", req.method);

  // Handle any method
  if (req.method === "OPTIONS") {
    return new Response("OK", { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    console.log("📦 Raw body:", rawBody);

    // Verify PayPal webhook signature
    const verified = await verifyPayPalWebhook(req.headers, rawBody);
    if (!verified) {
      console.error("❌ PayPal webhook signature verification failed");
      return new Response(
        JSON.stringify({ error: "signature_verification_failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("✅ PayPal webhook signature verified successfully");

    let webhook;
    try {
      webhook = JSON.parse(rawBody);
    } catch (e) {
      console.log("❌ Failed to parse JSON:", e);
      webhook = { raw_body: rawBody };
    }

    console.log("📋 Parsed webhook:", JSON.stringify(webhook, null, 2));

    // Simple success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Webhook received and verified",
        event_type: webhook.event_type || "unknown",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error("💥 Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  }
});
