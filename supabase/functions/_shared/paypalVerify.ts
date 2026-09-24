// Fail-closed PayPal webhook signature verification.
function baseUrl() {
  const env = (Deno.env.get("PAYPAL_ENVIRONMENT") || "sandbox").toLowerCase();
  return env === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

export async function verifyPayPalWebhookSignature(headers: Headers, rawBody: string): Promise<boolean> {
  try {
    const webhookId = Deno.env.get("PAYPAL_WEBHOOK_ID");
    const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    if (!webhookId || !clientId || !clientSecret) return false;
    const h = (k: string) => headers.get(k) || "";
    const fields = {
      auth_algo: h("paypal-auth-algo"),
      cert_url: h("paypal-cert-url"),
      transmission_id: h("paypal-transmission-id"),
      transmission_sig: h("paypal-transmission-sig"),
      transmission_time: h("paypal-transmission-time"),
    };
    if (Object.values(fields).some((v) => !v)) return false;
    const tokRes = await fetch(`${baseUrl()}/v1/oauth2/token`, {
      method: "POST",
      headers: { Authorization: "Basic " + btoa(`${clientId}:${clientSecret}`), "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
    });
    if (!tokRes.ok) return false;
    const { access_token } = await tokRes.json();
    const res = await fetch(`${baseUrl()}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...fields, webhook_id: webhookId, webhook_event: JSON.parse(rawBody) }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return String(data.verification_status || "").toUpperCase() === "SUCCESS";
  } catch {
    return false;
  }
}
