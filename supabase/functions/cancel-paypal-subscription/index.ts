import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function getPayPalBaseUrl() {
  const env = (Deno.env.get("PAYPAL_ENVIRONMENT") || "sandbox").toLowerCase();
  return env === "production" || env === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function getPayPalAccessToken() {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Missing PayPal credentials");

  const res = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) throw new Error(`PayPal token failed: ${await res.text()}`);
  const data = await res.json();
  return data.access_token as string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ success: false, error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return json({ success: false, error: "Unauthorized" }, 401);
    }
    const userId = claimsData.claims.sub as string;

    const body = (await req.json().catch(() => ({}))) as { subscription_row_id?: string };
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Fetch target subscription row
    let query = admin
      .from("subscriptions")
      .select("id, user_id, subscription_id, tier, cadence, status, next_billing_time, membership_expires_at")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1);

    if (body.subscription_row_id) {
      query = admin
        .from("subscriptions")
        .select("id, user_id, subscription_id, tier, cadence, status, next_billing_time, membership_expires_at")
        .eq("id", body.subscription_row_id)
        .limit(1);
    }

    const { data: rows, error: fetchErr } = await query;
    if (fetchErr) return json({ success: false, error: fetchErr.message }, 500);
    const row = rows?.[0];
    if (!row) return json({ success: false, error: "No active subscription found" }, 404);
    if (row.user_id !== userId) return json({ success: false, error: "Forbidden" }, 403);

    // Cancel with PayPal (idempotent)
    try {
      const accessToken = await getPayPalAccessToken();
      const cancelRes = await fetch(
        `${getPayPalBaseUrl()}/v1/billing/subscriptions/${row.subscription_id}/cancel`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason: "User requested cancellation" }),
        },
      );
      // 204 = ok. 422 with SUBSCRIPTION_STATUS_INVALID often means already cancelled — treat as ok.
      if (!cancelRes.ok && cancelRes.status !== 204) {
        const errText = await cancelRes.text();
        const already = errText.includes("SUBSCRIPTION_STATUS_INVALID") ||
          errText.toLowerCase().includes("cancelled") ||
          errText.toLowerCase().includes("canceled");
        if (!already) {
          console.error("PayPal cancel failed:", cancelRes.status, errText);
          return json({ success: false, error: `PayPal cancel failed: ${errText}` }, 502);
        }
      }
    } catch (e) {
      console.error("PayPal cancel error:", e);
      return json({ success: false, error: e instanceof Error ? e.message : "PayPal cancel error" }, 502);
    }

    // Compute expires_at: keep existing membership_expires_at if in future, else next_billing_time, else +30d
    const nowMs = Date.now();
    const existingExp = row.membership_expires_at ? new Date(row.membership_expires_at).getTime() : 0;
    const nextBilling = row.next_billing_time ? new Date(row.next_billing_time).getTime() : 0;
    let expiresAtMs = Math.max(existingExp, nextBilling);
    if (!expiresAtMs || expiresAtMs <= nowMs) {
      expiresAtMs = nowMs + 30 * 24 * 60 * 60 * 1000;
    }
    const expiresAt = new Date(expiresAtMs).toISOString();

    const { error: upErr } = await admin
      .from("subscriptions")
      .update({
        status: "cancelled",
        membership_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (upErr) return json({ success: false, error: upErr.message }, 500);

    return json({
      success: true,
      expires_at: expiresAt,
      tier: row.tier,
      cadence: row.cadence,
    });
  } catch (error) {
    console.error("cancel-paypal-subscription error:", error);
    return json(
      { success: false, error: error instanceof Error ? error.message : "Cancel failed" },
      500,
    );
  }
});
