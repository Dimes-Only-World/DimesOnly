// Admin payout helpers: member notification emails, company financials, PayPal batch payouts.
// deno-lint-ignore-file no-explicit-any

type Sender = (
  to: { email: string; name?: string },
  msg: { subject: string; html: string; text: string; category: string },
  attachments: never[],
) => Promise<{ ok: boolean }>;

const STATUS_FOR: Record<string, string> = { approved: "processing", paid: "completed", refunded: "refunded" };
const usd = (n: number) => `$${(Math.round(n * 100) / 100).toFixed(2)}`;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

/** Emails the member only when the request actually reached the matching status. Never throws. */
export async function notifyPayout(db: any, requestId: string, kind: "approved" | "paid" | "refunded", send: Sender) {
  try {
    const { data: r } = await db.from("payout_requests")
      .select("user_id, amount, payout_method, request_status, paid_reference, refund_reason")
      .eq("id", requestId).maybeSingle();
    if (!r || r.request_status !== STATUS_FOR[kind]) return false;
    const { data: u } = await db.from("users").select("email, username").eq("id", r.user_id).maybeSingle();
    if (!u?.email) return false;
    const amount = usd(Number(r.amount || 0));
    const lines: Record<string, string> = {
      approved: `Your payout request for ${amount} was approved and is scheduled for the next pay date.`,
      paid: `Your payout of ${amount} has been sent.${r.paid_reference ? ` Payment reference: ${r.paid_reference}.` : ""}`,
      refunded: `Your payout request for ${amount} was reversed and the funds were returned to your available balance.${r.refund_reason ? ` Reason: ${r.refund_reason}.` : ""}`,
    };
    const subject = { approved: "Your payout was approved", paid: "Your payout was sent", refunded: "Your payout was reversed" }[kind];
    const text = `Hi ${u.username || "there"},\n\n${lines[kind]}\n\nView details: https://dimesonly.world/dashboard/earnings`;
    const html = `<div style="background:#000;color:#f5f5f5;font-family:Arial,sans-serif;padding:24px">
      <h2 style="color:#d4af37;margin:0 0 12px">DIMES ONLY WORLD</h2>
      <p>Hi ${esc(u.username || "there")},</p><p>${esc(lines[kind])}</p>
      <p><a style="color:#d4af37" href="https://dimesonly.world/dashboard/earnings">View your earnings</a></p></div>`;
    const res = await send({ email: u.email, name: u.username }, { subject, html, text, category: `payout_${kind}` }, []);
    return res.ok;
  } catch (e) {
    console.error("notifyPayout failed", e);
    return false;
  }
}

async function all(db: any, table: string, cols: string, apply: (q: any) => any) {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await apply(db.from(table).select(cols)).range(from, from + 999);
    if (error) { console.error(table, error.message); break; }
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const sum = (rows: any[], f: (r: any) => number) => Math.round(rows.reduce((s, r) => s + (Number(f(r)) || 0), 0) * 100) / 100;

export const RENTAL_SPLIT = { referrer: 0.85, upline: 0.10, company: 0.05 } as const;

/** Base company keep ratios (when a member is the direct referrer). */
export const KEEP = { tips: 0.10, car_sales: 0.42, rentals: RENTAL_SPLIT.company, clothing: 0.85, memberships: 0.7, tickets: 0.7, flameflix: 0.85 };
/** Upline override share the company also keeps when it is the direct referrer's upline. */
export const OVERRIDE = { car_sales: 0.05, rentals: RENTAL_SPLIT.upline, clothing: 0.10, memberships: 0.10, tickets: 0.10, flameflix: 0.10 } as Record<string, number>;

const isCompany = (r: unknown) => {
  const s = String(r ?? "").trim().replace(/^@/, "").toLowerCase();
  return !s || s === "company";
};

/** Company keep rate for one sale given its direct referrer (tips are always the flat rate). */
export function keepRateFor(stream: string, direct: unknown, upline: unknown): number {
  const base = (KEEP as any)[stream] ?? 1;
  if (stream === "tips") return base;
  if (isCompany(direct)) return 1;
  return isCompany(upline) ? Math.min(1, Math.round((base + (OVERRIDE[stream] ?? 0)) * 100) / 100) : base;
}

export async function companyFinancials(db: any) {
  const [tips, rentals, ext, store, sales, payments, tickets, flix, payouts, users] = await Promise.all([
    all(db, "tips_transactions", "tip_amount", (q) => q.eq("payment_status", "completed")),
    all(db, "rental_bookings", "id, total_price, amount_received, security_deposit, paid_at, referrer_username, upline_referrer_username, renter_user_id", (q) => q.not("paid_at", "is", null)),
    all(db, "rental_extensions", "total_charged, booking_id, renter_user_id", (q) => q.eq("status", "paid")),
    all(db, "store_orders", "total_cents, status, user_id", (q) => q.in("status", ["paid", "completed", "shipped", "delivered", "fulfilled"])),
    all(db, "vehicle_purchase_applications", "sale_amount, referrer_user_id, referrer_username, upline_user_id", (q) => q.eq("sale_status", "sold")),
    all(db, "payments", "amount, event_id, referred_by, user_id", (q) => q.in("payment_status", ["completed", "paid"])),
    all(db, "user_events", "amount_paid, referred_by, user_id", (q) => q.in("payment_status", ["paid", "completed"])),
    all(db, "flix_subscriptions", "amount_cents, user_id", (q) => q.not("paid_at", "is", null)),
    all(db, "payout_requests", "amount, request_status", (q) => q),
    all(db, "users", "id, username, referred_by", (q) => q),
  ]);
  const byId = new Map<string, any>(users.map((u: any) => [u.id, u]));
  const byName = new Map<string, any>(users.map((u: any) => [String(u.username || "").toLowerCase(), u]));
  const refOfUser = (id: unknown) => byId.get(String(id))?.referred_by ?? null;
  const uplineOfName = (name: unknown) => isCompany(name) ? null : byName.get(String(name).replace(/^@/, "").toLowerCase())?.referred_by ?? null;
  const bookingById = new Map<string, any>(rentals.map((b: any) => [b.id, b]));

  const acc: Record<string, { gross: number; profit: number }> = {};
  const add = (stream: string, amount: unknown, direct: unknown, upline?: unknown) => {
    const a = Number(amount) || 0;
    const up = upline !== undefined ? upline : uplineOfName(direct);
    const e = (acc[stream] ||= { gross: 0, profit: 0 });
    e.gross += a; e.profit += a * keepRateFor(stream, direct, up);
  };
  for (const r of tips) add("tips", r.tip_amount, null);
  for (const r of rentals) {
    const direct = r.referrer_username ?? refOfUser(r.renter_user_id);
    add("rentals", r.amount_received ?? (Number(r.total_price) || 0), direct, r.referrer_username ? (r.upline_referrer_username ?? uplineOfName(direct)) : undefined);
  }
  for (const r of ext) {
    const b = bookingById.get(r.booking_id);
    const direct = b?.referrer_username ?? refOfUser(r.renter_user_id);
    add("rentals", r.total_charged, direct, b?.referrer_username ? (b.upline_referrer_username ?? uplineOfName(direct)) : undefined);
  }
  for (const r of sales) {
    const directUser = r.referrer_user_id ? byId.get(r.referrer_user_id) : null;
    const direct = directUser?.username ?? r.referrer_username;
    const upline = r.upline_user_id ? byId.get(r.upline_user_id)?.username ?? null : uplineOfName(direct);
    add("car_sales", r.sale_amount, direct, upline);
  }
  for (const r of store) add("clothing", (Number(r.total_cents) || 0) / 100, refOfUser(r.user_id));
  for (const r of payments.filter((p: any) => !p.event_id)) add("memberships", r.amount, r.referred_by ?? refOfUser(r.user_id));
  for (const r of tickets) add("tickets", r.amount_paid, r.referred_by ?? refOfUser(r.user_id));
  for (const r of flix) add("flameflix", (Number(r.amount_cents) || 0) / 100, refOfUser(r.user_id));

  const order = ["tips", "rentals", "car_sales", "clothing", "memberships", "tickets", "flameflix"];
  const streams = order.map((k) => {
    const e = acc[k] || { gross: 0, profit: 0 };
    const gross = Math.round(e.gross * 100) / 100;
    const companyProfit = Math.round(e.profit * 100) / 100;
    return { stream: k, gross, keepRate: gross > 0 ? companyProfit / gross : (KEEP as any)[k], companyProfit };
  });
  const totalVolume = sum(streams, (s) => s.gross);
  const owed = sum(payouts.filter((p) => ["pending", "processing"].includes(p.request_status)), (r) => r.amount);
  const paid = sum(payouts.filter((p) => p.request_status === "completed"), (r) => r.amount);
  const netProfit = sum(streams, (s) => s.companyProfit);
  return { totalVolume, commissionsOwed: owed, commissionsPaid: paid, netProfit, streams, asOf: new Date().toISOString() };
}

function paypalBase() {
  return (Deno.env.get("PAYPAL_ENVIRONMENT") || "sandbox").toLowerCase() === "live"
    ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

async function batchId(ids: string[]) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode([...ids].sort().join(",")));
  return "DOW-" + [...new Uint8Array(buf)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Sends approved PayPal payout requests via PayPal Payouts API, then marks them paid. */
export async function executePaypalBatch(db: any, requestIds: unknown, send: Sender) {
  if (!Array.isArray(requestIds) || !requestIds.length || requestIds.length > 500 || requestIds.some((x) => typeof x !== "string")) {
    throw new Error("Select between 1 and 500 payout requests");
  }
  const { data: rows, error } = await db.from("payout_requests")
    .select("id, amount, paypal_email, payout_method, request_status")
    .in("id", requestIds).eq("payout_method", "paypal").eq("request_status", "processing");
  if (error) throw error;
  const valid = (rows || []).filter((r: any) => r.paypal_email && Number(r.amount) > 0);
  if (!valid.length) throw new Error("No approved PayPal requests with a PayPal email were selected");

  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const secret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  if (!clientId || !secret) throw new Error("PayPal is not configured");
  const tok = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: "Basic " + btoa(`${clientId}:${secret}`), "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!tok.ok) throw new Error("Could not connect to PayPal");
  const { access_token } = await tok.json();

  // Deterministic batch id: PayPal rejects a repeated id, so the same selection can never be paid twice.
  const sender_batch_id = await batchId(valid.map((r: any) => r.id));
  const res = await fetch(`${paypalBase()}/v1/payments/payouts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender_batch_header: { sender_batch_id, email_subject: "You have a payout from Dimes Only World", email_message: "Your Dimes Only World earnings payout has been sent." },
      items: valid.map((r: any) => ({
        recipient_type: "EMAIL",
        amount: { value: Number(r.amount).toFixed(2), currency: "USD" },
        receiver: r.paypal_email,
        sender_item_id: r.id,
        note: "Dimes Only World earnings payout",
      })),
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.name === "USER_BUSINESS_ERROR" && /duplicate/i.test(JSON.stringify(body))
      ? "This exact batch was already sent to PayPal"
      : body?.message || body?.name || `PayPal returned ${res.status}`;
    throw new Error(msg);
  }
  const payoutBatchId = body?.batch_header?.payout_batch_id || sender_batch_id;
  const now = new Date().toISOString();
  const ids = valid.map((r: any) => r.id);
  const { error: upErr } = await db.from("payout_requests").update({
    request_status: "completed", processed_date: now, paid_at: now,
    paid_reference: `PayPal batch ${payoutBatchId}`, notes: "Paid via PayPal batch payout",
  }).in("id", ids).eq("request_status", "processing");
  if (upErr) throw upErr;
  let emailed = 0;
  for (const id of ids) if (await notifyPayout(db, id, "paid", send)) emailed++;
  return { success: true, paid: ids.length, total: sum(valid, (r: any) => r.amount), payoutBatchId, emailed };
}
