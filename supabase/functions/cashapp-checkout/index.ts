// Cash App manual checkout: buyers create a pending payment with a code;
// admins confirm (delivers the item through shared fulfillment) or reject.
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { AUTH_HEADERS, getCallerId, getVerifiedAdminId } from "../_shared/caller.ts";
import { fulfillEventPayment } from "../_shared/eventFulfill.ts";
import { fulfillStoreOrder, priceStoreOrder } from "../_shared/storeFulfill.ts";
import { countSold, stageFor, type PlusType } from "../_shared/membershipPricing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": AUTH_HEADERS,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.union([
  z.object({ action: z.literal("create"), kind: z.literal("tip"),
    tipped_username: z.string().min(1).max(100), amount: z.number().min(5).max(1000),
    message: z.string().max(1000).optional(), referrer_username: z.string().max(100).nullish() }),
  z.object({ action: z.literal("create"), kind: z.literal("event"),
    event_id: z.string().uuid(), amount: z.number().positive().max(100000),
    ticket_type: z.string().max(50).optional(), ticket_quantity: z.number().int().min(1).max(50).optional() }),
  z.object({ action: z.literal("create"), kind: z.literal("store"),
    items: z.array(z.object({ variant_id: z.string().uuid(), qty: z.number().int().min(1).max(20) })).min(1).max(50),
    email: z.string().email().max(255), shipping_method: z.string().max(20).optional(),
    discount_code: z.string().max(50).nullish(), shipping_address: z.record(z.unknown()).optional() }),
  z.object({ action: z.literal("create"), kind: z.literal("membership"),
    tier: z.string().min(1).max(50), amount: z.number().positive().max(100000),
    phone_number: z.string().max(30).optional() }),
  z.object({ action: z.literal("create"), kind: z.literal("host_deposit"),
    applicationIds: z.array(z.string().uuid()).min(1).max(20) }),
  z.object({ action: z.literal("mine") }),
  z.object({ action: z.literal("list"), status: z.string().max(20).optional() }),
  z.object({ action: z.literal("confirm"), id: z.string().uuid(), cashapp_reference: z.string().min(1).max(200) }),
  z.object({ action: z.literal("reject"), id: z.string().uuid(), reason: z.string().max(500).optional() }),
]);

const ONE_TIME_TIERS = new Set(["silver", "silver_plus", "diamond_plus", "elite", "business_owner_elite"]);

function newCode() {
  const b = crypto.getRandomValues(new Uint8Array(4));
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Invalid request" }, 400);
    const b = parsed.data;
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // ---------- Admin actions ----------
    if (b.action === "list" || b.action === "confirm" || b.action === "reject") {
      const adminId = await getVerifiedAdminId(req);
      if (!adminId) return json({ error: "Admin access required" }, 403);

      if (b.action === "list") {
        let q = db.from("cashapp_payments").select("*").order("created_at", { ascending: false }).limit(500);
        if (b.status && b.status !== "all") q = q.eq("status", b.status);
        const { data, error } = await q;
        if (error) throw error;
        return json({ payments: data || [] });
      }

      // Claim the pending row atomically so it can only be processed once.
      const nextStatus = b.action === "confirm" ? "confirmed" : "rejected";
      const { data: claimed, error: cErr } = await db.from("cashapp_payments")
        .update({
          status: nextStatus,
          confirmed_by: adminId,
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...(b.action === "confirm" ? { cashapp_reference: b.cashapp_reference } : { rejected_reason: b.reason || null }),
        })
        .eq("id", b.id).eq("status", "pending").select("*").maybeSingle();
      if (cErr) throw cErr;
      if (!claimed) return json({ error: "This payment was already handled" }, 409);

      if (b.action === "reject") {
        if (claimed.kind === "store" && claimed.reference_id) {
          await db.from("store_orders").update({ status: "cancelled" }).eq("id", claimed.reference_id).eq("status", "pending");
        }
        if (claimed.kind === "membership" && claimed.reference_id) {
          await db.from("membership_upgrades").update({ payment_status: "failed", upgrade_status: "cancelled" })
            .eq("id", claimed.reference_id).neq("upgrade_status", "completed");
        }
        return json({ success: true });
      }

      try {
        await fulfill(db, claimed);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await db.from("cashapp_payments").update({ fulfillment_error: msg }).eq("id", claimed.id);
        return json({ error: `Payment marked confirmed, but delivery failed: ${msg}` }, 500);
      }
      return json({ success: true });
    }

    // ---------- Member actions ----------
    const userId = await getCallerId(req);
    if (!userId) return json({ error: "Please sign in again to continue." }, 401);

    if (b.action === "mine") {
      const { data } = await db.from("cashapp_payments")
        .select("id, kind, amount, payment_code, description, status, created_at, confirmed_at")
        .eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
      return json({ payments: data || [] });
    }

    const { data: me } = await db.from("users").select("id, username").eq("id", userId).maybeSingle();
    const username = me?.username || null;
    const code = newCode();
    let amount = 0;
    let description = "";
    let referenceId: string | null = null;
    const details: Record<string, unknown> = {};

    if (b.kind === "tip") {
      amount = Math.round(b.amount * 100) / 100;
      description = `Tip for @${b.tipped_username}`;
      Object.assign(details, { tipped_username: b.tipped_username, message: b.message || "", referrer_username: b.referrer_username || null });
    } else if (b.kind === "event") {
      const { data: ev } = await db.from("events").select("*").eq("id", b.event_id).maybeSingle();
      if (!ev) return json({ error: "Event not found" }, 404);
      const { count } = await db.from("user_events").select("*", { count: "exact", head: true }).eq("event_id", b.event_id);
      if ((count ?? 0) >= ev.max_attendees) return json({ error: "Event is sold out" }, 409);
      const priceFields = ["price", "general_admission_price", "males_price", "females_price", "vip_price", "vip_section_price", "group_discount_price"];
      const prices = priceFields.map((k) => Number(ev[k])).filter((n) => Number.isFinite(n) && n > 0);
      const pct = (v: unknown) => 1 - Math.min(100, Math.max(0, Number(v) || 0)) / 100;
      const qty = b.ticket_quantity || 1;
      const floor = (prices.length ? Math.min(...prices) : 0) * pct(ev.early_bird_percent) * pct(ev.plus_extra_percent) * pct(ev.plus_discount_percent) - 0.02 * qty;
      if (b.amount < floor) return json({ error: "Invalid ticket amount" }, 400);
      amount = Math.round(b.amount * 100) / 100;
      referenceId = b.event_id;
      description = `Event ticket – ${ev.name}`;
      Object.assign(details, { event_id: b.event_id, event_owner_id: ev.host_user_id || null, ticket_type: b.ticket_type || "general", ticket_quantity: qty });
    } else if (b.kind === "store") {
      const priced = await priceStoreOrder(db, { items: b.items, shipping_method: b.shipping_method, discount_code: b.discount_code });
      if ("error" in priced) return json({ error: priced.error }, 400);
      const { data: order, error: oErr } = await db.from("store_orders").insert({
        user_id: userId, email: b.email, status: "pending",
        subtotal_cents: priced.subtotal, shipping_cents: priced.shippingCents, discount_cents: priced.discountCents,
        total_cents: priced.totalCents, discount_code: priced.appliedCode, paypal_order_id: `cashapp_${code}`,
        shipping_address: b.shipping_address || {}, shipping_method: priced.shippingMethod,
      }).select("id").single();
      if (oErr) throw oErr;
      const { error: iErr } = await db.from("store_order_items").insert(priced.orderItems.map((oi) => ({ ...oi, order_id: order.id })));
      if (iErr) throw iErr;
      amount = priced.totalCents / 100;
      referenceId = order.id;
      description = "Dimes Only Clothing order";
    } else if (b.kind === "membership") {
      if (!ONE_TIME_TIERS.has(b.tier)) return json({ error: "Cash App is only available for one-time memberships" }, 400);
      amount = b.amount;
      const plusType: PlusType | null = b.tier === "silver_plus" || b.tier === "diamond_plus" || b.tier === "business_owner_elite" ? b.tier as PlusType : null;
      if (plusType) {
        const stage = stageFor(plusType, await countSold(db, plusType));
        if (!stage) return json({ error: "POSITIONS ARE FILLED" }, 409);
        amount = stage.full;
      }
      if (b.tier === "elite") amount = 10000;
      if (b.tier === "silver") amount = 49.99;
      if (b.phone_number) await db.from("users").update({ phone_number: b.phone_number }).eq("id", userId);
      const { data: up, error: uErr } = await db.from("membership_upgrades").insert({
        user_id: userId, upgrade_type: b.tier, payment_amount: amount, payment_method: "cashapp",
        installment_plan: false, installment_count: 1, phone_number: b.phone_number || null,
        payment_status: "pending_payment", upgrade_status: "pending", paypal_order_id: `cashapp_${code}`,
      }).select("id").single();
      if (uErr) throw uErr;
      referenceId = up.id;
      description = `${b.tier.replace(/_/g, " ")} membership`;
    } else if (b.kind === "host_deposit") {
      const ids = [...new Set(b.applicationIds)];
      const { data: apps } = await db.from("host_applications").select("id, deposit_status").in("id", ids).eq("user_id", userId);
      if (!apps || apps.length !== ids.length) return json({ error: "Vehicle applications were not found" }, 404);
      if (apps.some((a) => a.deposit_status === "paid")) return json({ error: "This deposit has already been paid" }, 409);
      amount = ids.length * 250;
      referenceId = ids[0];
      description = `Host deposit (${ids.length} vehicle${ids.length === 1 ? "" : "s"})`;
      details.applicationIds = ids;
    }

    const { data: row, error } = await db.from("cashapp_payments").insert({
      kind: b.kind, reference_id: referenceId, user_id: userId, username,
      amount, payment_code: code, description, details,
    }).select("id, amount, payment_code, description").single();
    if (error) throw error;
    return json({ success: true, payment: row });
  } catch (e) {
    console.error("cashapp-checkout error", e);
    return json({ error: e instanceof Error ? e.message : "Cash App checkout failed" }, 500);
  }
});

// deno-lint-ignore no-explicit-any
async function fulfill(db: any, p: any) {
  const d = p.details || {};
  const txId = `cashapp_${p.payment_code}`;
  if (p.kind === "tip") {
    const { data, error } = await db.functions.invoke("process-tip", {
      body: {
        tipper_id: p.user_id, tipper_username: p.username || "anonymous", tipped_username: d.tipped_username,
        amount: Number(p.amount), message: d.message || "", referrer_username: d.referrer_username || null,
        paypal_capture_id: txId,
      },
    });
    if (error || data?.error) throw new Error(data?.error || error?.message || "Tip processing failed");
  } else if (p.kind === "event") {
    await fulfillEventPayment(db, {
      orderId: txId, transactionId: txId, grossAmount: Number(p.amount), event_id: d.event_id,
      event_owner_id: d.event_owner_id, buyer_id: p.user_id, buyer_username: p.username,
      ticket_type: d.ticket_type, ticket_quantity: d.ticket_quantity,
    });
  } else if (p.kind === "store") {
    const { data: order } = await db.from("store_orders").select("*").eq("id", p.reference_id).maybeSingle();
    if (!order) throw new Error("Order not found");
    await fulfillStoreOrder(db, order);
  } else if (p.kind === "membership") {
    const { data, error } = await db.functions.invoke("membership-webhook", {
      body: { event_type: "PAYMENT.CAPTURE.COMPLETED", resource: { id: txId } },
    });
    if (error || data?.error) throw new Error(data?.error || error?.message || "Membership activation failed");
  } else if (p.kind === "host_deposit") {
    const { error } = await db.from("host_applications")
      .update({ deposit_status: "paid", deposit_paypal_capture_id: txId, deposit_paid_at: new Date().toISOString() })
      .in("id", d.applicationIds || []).eq("user_id", p.user_id).eq("deposit_status", "pending");
    if (error) throw error;
  }
}
