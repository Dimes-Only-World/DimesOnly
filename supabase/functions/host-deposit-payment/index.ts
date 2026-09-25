import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { AUTH_HEADERS, getCallerId } from "../_shared/caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": AUTH_HEADERS,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const BodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    applicationIds: z.array(z.string().uuid()).min(1).max(20),
    returnUrl: z.string().url().max(500),
    cancelUrl: z.string().url().max(500),
  }),
  z.object({ action: z.literal("capture"), orderId: z.string().min(5).max(100) }),
]);

async function paypalToken(clientId: string, clientSecret: string, baseUrl: string) {
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!response.ok) throw new Error("Payment service authentication failed");
  const body = await response.json();
  if (!body?.access_token) throw new Error("Payment service authentication failed");
  return String(body.access_token);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Invalid payment request" }, 400);

    const callerId = await getCallerId(req);
    if (!callerId) return json({ error: "Please sign in again to continue." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    if (!supabaseUrl || !serviceRoleKey || !clientId || !clientSecret) {
      return json({ error: "Payment service is not configured" }, 500);
    }
    const environment = Deno.env.get("PAYPAL_ENVIRONMENT") || "sandbox";
    const baseUrl = environment === "live" || environment === "production"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";
    const admin = createClient(supabaseUrl, serviceRoleKey);

    if (parsed.data.action === "create") {
      const ids = [...new Set(parsed.data.applicationIds)];
      const { data: applications, error } = await admin
        .from("host_applications")
        .select("id, user_id, deposit_status")
        .in("id", ids)
        .eq("user_id", callerId);
      if (error || !applications || applications.length !== ids.length) {
        return json({ error: "Vehicle applications were not found" }, 404);
      }
      if (applications.some((row) => row.deposit_status === "paid")) {
        return json({ error: "This deposit has already been paid" }, 409);
      }

      const amount = applications.length * 250;
      const accessToken = await paypalToken(clientId, clientSecret, baseUrl);
      const orderResponse = await fetch(`${baseUrl}/v2/checkout/orders`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [{
            reference_id: applications[0].id,
            custom_id: `host_deposit_${applications[0].id}_${applications.length}`,
            description: `Refundable host deposit for ${applications.length} vehicle${applications.length === 1 ? "" : "s"}`,
            amount: { currency_code: "USD", value: amount.toFixed(2) },
          }],
          application_context: {
            return_url: parsed.data.returnUrl,
            cancel_url: parsed.data.cancelUrl,
            brand_name: "Dimes Only Rentals",
            user_action: "PAY_NOW",
            landing_page: "LOGIN",
          },
        }),
      });
      const order = await orderResponse.json();
      if (!orderResponse.ok) return json({ error: "Could not start deposit payment" }, 502);
      const approvalUrl = order.links?.find((link: { rel?: string; href?: string }) => link.rel === "approve")?.href;
      if (!order.id || !approvalUrl) return json({ error: "Could not start deposit payment" }, 502);

      const { error: updateError } = await admin
        .from("host_applications")
        .update({ deposit_paypal_order_id: order.id })
        .in("id", ids)
        .eq("user_id", callerId)
        .eq("deposit_status", "pending");
      if (updateError) return json({ error: "Could not save deposit payment" }, 500);
      return json({ success: true, orderId: order.id, approvalUrl, amount });
    }

    const { data: applications, error } = await admin
      .from("host_applications")
      .select("id, user_id, deposit_status, deposit_paypal_capture_id")
      .eq("deposit_paypal_order_id", parsed.data.orderId)
      .eq("user_id", callerId);
    if (error || !applications?.length) return json({ error: "Deposit payment was not found" }, 404);
    if (applications.every((row) => row.deposit_status === "paid" && row.deposit_paypal_capture_id)) {
      return json({ success: true, alreadyProcessed: true, amount: applications.length * 250 });
    }

    const expectedAmount = applications.length * 250;
    const accessToken = await paypalToken(clientId, clientSecret, baseUrl);
    const captureResponse = await fetch(`${baseUrl}/v2/checkout/orders/${encodeURIComponent(parsed.data.orderId)}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    });
    const capture = await captureResponse.json();
    if (!captureResponse.ok || capture.status !== "COMPLETED") {
      return json({ error: "Deposit payment was not completed" }, 400);
    }
    const payment = capture.purchase_units?.[0]?.payments?.captures?.[0];
    const capturedAmount = Number(payment?.amount?.value);
    const currency = payment?.amount?.currency_code;
    const captureId = payment?.id;
    if (!captureId || currency !== "USD" || !Number.isFinite(capturedAmount) || Math.abs(capturedAmount - expectedAmount) > 0.001) {
      return json({ error: "Deposit payment amount could not be verified" }, 400);
    }

    const paidAt = new Date().toISOString();
    const { error: updateError } = await admin
      .from("host_applications")
      .update({ deposit_status: "paid", deposit_paypal_capture_id: captureId, deposit_paid_at: paidAt })
      .eq("deposit_paypal_order_id", parsed.data.orderId)
      .eq("user_id", callerId)
      .eq("deposit_status", "pending");
    if (updateError) return json({ error: "Payment completed, but its status could not be saved. Please contact support." }, 500);
    return json({ success: true, amount: expectedAmount, captureId });
  } catch (error) {
    console.error("Host deposit payment error", error);
    return json({ error: error instanceof Error ? error.message : "Deposit payment failed" }, 500);
  }
});