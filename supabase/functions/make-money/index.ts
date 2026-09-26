import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { AUTH_HEADERS, getCallerId, getVerifiedAdminId } from "../_shared/caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": AUTH_HEADERS,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const QR_PRICE = 1.99;
const PLUS_TIERS = ["silver_plus", "diamond_plus", "elite", "elite_plus", "business_owner_elite", "business_owner_elite_installment"];
const norm = (v: unknown) => String(v ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("qrStatus") }),
  z.object({ action: z.literal("qrCreate"), returnUrl: z.string().url().max(500), cancelUrl: z.string().url().max(500) }),
  z.object({ action: z.literal("qrCapture"), orderId: z.string().min(5).max(100) }),
  z.object({ action: z.literal("listFlyers") }),
  z.object({ action: z.literal("listMessages") }),
  z.object({ action: z.literal("adminListFlyers") }),
  z.object({
    action: z.literal("adminAddFlyer"),
    title: z.string().max(200).default(""),
    fileName: z.string().max(200),
    contentType: z.string().regex(/^(image\/(png|jpeg|jpg|webp|gif)|application\/pdf)$/),
    base64: z.string().max(21_000_000),
  }),
  z.object({ action: z.literal("adminUpdateFlyer"), id: z.string().uuid(), title: z.string().max(200).optional(), sort_order: z.number().int().optional(), is_active: z.boolean().optional() }),
  z.object({ action: z.literal("adminDeleteFlyer"), id: z.string().uuid() }),
  z.object({ action: z.literal("adminListMessages") }),
  z.object({ action: z.literal("adminAddMessage"), title: z.string().max(120).default(""), body: z.string().min(1).max(5000) }),
  z.object({
    action: z.literal("adminUpdateMessage"),
    id: z.string().uuid(),
    title: z.string().max(120).optional(),
    body: z.string().min(1).max(5000).optional(),
    sort_order: z.number().int().min(0).max(10000).optional(),
    is_active: z.boolean().optional(),
  }),
  z.object({ action: z.literal("adminDeleteMessage"), id: z.string().uuid() }),
]);

async function paypalToken(clientId: string, secret: string, base: string) {
  const r = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${clientId}:${secret}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const b = await r.json();
  if (!r.ok || !b?.access_token) throw new Error("Payment service authentication failed");
  return String(b.access_token);
}

async function signFlyers(admin: any, rows: any[]) {
  return Promise.all(rows.map(async (f) => {
    let url = f.image_url;
    if (f.storage_path) {
      const { data } = await admin.storage.from("flyers").createSignedUrl(f.storage_path, 3600);
      url = data?.signedUrl || "";
    }
    return { ...f, url };
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Invalid request" }, 400);
    const p = parsed.data;
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (p.action.startsWith("admin")) {
      const adminId = await getVerifiedAdminId(req);
      if (!adminId) return json({ error: "Admin session expired. Please sign in again." }, 401);
      const { data: ok } = await admin.rpc("check_admin_by_user_id", { _user_id: adminId });
      if (!ok) return json({ error: "Admin access required" }, 403);

      if (p.action === "adminListFlyers") {
        const { data, error } = await admin.from("flyers").select("*").order("sort_order").order("created_at");
        if (error) throw error;
        return json({ flyers: await signFlyers(admin, data || []) });
      }
      if (p.action === "adminAddFlyer") {
        const bytes = Uint8Array.from(atob(p.base64), (c) => c.charCodeAt(0));
        if (bytes.length > 15 * 1024 * 1024) return json({ error: "File is larger than 15MB" }, 400);
        const safe = p.fileName.replace(/[^A-Za-z0-9._-]/g, "_");
        const path = `${crypto.randomUUID()}-${safe}`;
        const { error: upErr } = await admin.storage.from("flyers").upload(path, bytes, { contentType: p.contentType });
        if (upErr) throw upErr;
        const { data: max } = await admin.from("flyers").select("sort_order").order("sort_order", { ascending: false }).limit(1);
        const { error } = await admin.from("flyers").insert({ title: p.title, storage_path: path, sort_order: (max?.[0]?.sort_order ?? 0) + 1 });
        if (error) throw error;
        return json({ ok: true });
      }
      if (p.action === "adminUpdateFlyer") {
        const { id, action: _a, ...rest } = p;
        const { error } = await admin.from("flyers").update(rest).eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }
      if (p.action === "adminDeleteFlyer") {
        const { data: row } = await admin.from("flyers").select("storage_path").eq("id", p.id).maybeSingle();
        if (row?.storage_path) await admin.storage.from("flyers").remove([row.storage_path]);
        const { error } = await admin.from("flyers").delete().eq("id", p.id);
        if (error) throw error;
        return json({ ok: true });
      }
      if (p.action === "adminListMessages") {
        const { data, error } = await admin.from("make_money_messages").select("*").order("sort_order").order("created_at");
        if (error) throw error;
        return json({ messages: data || [] });
      }
      if (p.action === "adminAddMessage") {
        const { data: max } = await admin.from("make_money_messages").select("sort_order").order("sort_order", { ascending: false }).limit(1);
        const { error } = await admin.from("make_money_messages").insert({
          title: p.title,
          body: p.body,
          sort_order: (max?.[0]?.sort_order ?? 0) + 1,
        });
        if (error) throw error;
        return json({ ok: true });
      }
      if (p.action === "adminUpdateMessage") {
        const { id, action: _action, ...changes } = p;
        const { error } = await admin.from("make_money_messages").update(changes).eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }
      if (p.action === "adminDeleteMessage") {
        const { error } = await admin.from("make_money_messages").delete().eq("id", p.id);
        if (error) throw error;
        return json({ ok: true });
      }
    }

    if (p.action === "listFlyers") {
      const { data, error } = await admin.from("flyers").select("id,title,image_url,storage_path,sort_order").eq("is_active", true).order("sort_order").order("created_at");
      if (error) throw error;
      return json({ flyers: (await signFlyers(admin, data || [])).map(({ storage_path: _s, ...f }) => f) });
    }

    const callerId = await getCallerId(req);
    if (!callerId) return json({ error: "Please sign in again to continue." }, 401);

    if (p.action === "listMessages") {
      const { data, error } = await admin
        .from("make_money_messages")
        .select("id,title,body,sort_order")
        .eq("is_active", true)
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return json({ messages: data || [] });
    }

    if (p.action === "qrStatus") {
      const { data: u } = await admin.from("users")
        .select("membership_tier, membership_type, silver_plus_active, diamond_plus_active, business_owner_elite_active")
        .eq("id", callerId).maybeSingle();
      const member = !!u && (u.silver_plus_active || u.diamond_plus_active || u.business_owner_elite_active ||
        PLUS_TIERS.includes(norm(u.membership_tier)) || PLUS_TIERS.includes(norm(u.membership_type)));
      if (member) return json({ unlocked: true, reason: "membership" });
      const { data: paid } = await admin.from("qr_code_purchases").select("id").eq("user_id", callerId).eq("status", "paid").limit(1);
      return json({ unlocked: !!paid?.length, reason: paid?.length ? "purchase" : null });
    }

    const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const secret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    if (!clientId || !secret) return json({ error: "Payment service is not configured" }, 500);
    const env = Deno.env.get("PAYPAL_ENVIRONMENT") || "sandbox";
    const base = env === "live" || env === "production" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

    if (p.action === "qrCreate") {
      const token = await paypalToken(clientId, secret, base);
      const r = await fetch(`${base}/v2/checkout/orders`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [{ custom_id: `qr_${callerId}`, description: "Referral QR code download", amount: { currency_code: "USD", value: QR_PRICE.toFixed(2) } }],
          application_context: { return_url: p.returnUrl, cancel_url: p.cancelUrl, brand_name: "Dimes Only World", user_action: "PAY_NOW" },
        }),
      });
      const order = await r.json();
      const approvalUrl = order.links?.find((l: any) => l.rel === "approve")?.href;
      if (!r.ok || !order.id || !approvalUrl) return json({ error: "Could not start payment" }, 502);
      const { error } = await admin.from("qr_code_purchases").insert({ user_id: callerId, paypal_order_id: order.id, amount: QR_PRICE });
      if (error) throw error;
      return json({ approvalUrl });
    }

    // qrCapture
    const { data: row } = await admin.from("qr_code_purchases").select("*").eq("paypal_order_id", p.orderId).eq("user_id", callerId).maybeSingle();
    if (!row) return json({ error: "Payment not found" }, 404);
    if (row.status === "paid") return json({ success: true });
    const token = await paypalToken(clientId, secret, base);
    const r = await fetch(`${base}/v2/checkout/orders/${encodeURIComponent(p.orderId)}/capture`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    const cap = await r.json();
    const pay = cap.purchase_units?.[0]?.payments?.captures?.[0];
    if (!r.ok || cap.status !== "COMPLETED" || pay?.amount?.currency_code !== "USD" || Math.abs(Number(pay?.amount?.value) - QR_PRICE) > 0.001) {
      return json({ error: "Payment was not completed" }, 400);
    }
    await admin.from("qr_code_purchases").update({ status: "paid", paypal_capture_id: pay.id, paid_at: new Date().toISOString() }).eq("id", row.id);
    return json({ success: true });
  } catch (e) {
    console.error("make-money error", e);
    return json({ error: e instanceof Error ? e.message : "Request failed" }, 500);
  }
});
