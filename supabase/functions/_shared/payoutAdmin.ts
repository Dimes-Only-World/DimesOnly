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

/** Company keep ratios used for the profit estimate. */
export const KEEP = { tips: 0.45, car_sales: 0.42, rentals: 0.85, clothing: 0.85, memberships: 0.7, tickets: 1, flameflix: 0.85 };

export async function companyFinancials(db: any) {
  const [tips, rentals, ext, store, sales, payments, tickets, flix, payouts] = await Promise.all([
    all(db, "tips_transactions", "tip_amount", (q) => q.eq("payment_status", "completed")),
    all(db, "rental_bookings", "total_price, amount_received, security_deposit, paid_at", (q) => q.not("paid_at", "is", null)),
    all(db, "rental_extensions", "total_charged", (q) => q.eq("status", "paid")),
    all(db, "store_orders", "total_cents, status", (q) => q.in("status", ["paid", "completed", "shipped", "delivered", "fulfilled"])),
    all(db, "vehicle_purchase_applications", "sale_amount", (q) => q.eq("sale_status", "sold")),
    all(db, "payments", "amount, event_id", (q) => q.in("payment_status", ["completed", "paid"])),
    all(db, "user_events", "amount_paid", (q) => q.in("payment_status", ["paid", "completed"])),
    all(db, "flix_subscriptions", "amount_cents", (q) => q.not("paid_at", "is", null)),
    all(db, "payout_requests", "amount, request_status", (q) => q),
  ]);
  const gross = {
    tips: sum(tips, (r) => r.tip_amount),
    rentals: sum(rentals, (r) => r.amount_received ?? (Number(r.total_price) || 0)) + sum(ext, (r) => r.total_charged),
    car_sales: sum(sales, (r) => r.sale_amount),
    clothing: sum(store, (r) => r.total_cents / 100),
    memberships: sum(payments.filter((p) => !p.event_id), (r) => r.amount),
    tickets: sum(tickets, (r) => r.amount_paid),
    flameflix: sum(flix, (r) => r.amount_cents / 100),
  };
  const streams = Object.entries(gross).map(([k, v]) => ({
    stream: k, gross: Math.round(v * 100) / 100, keepRate: (KEEP as any)[k] ?? 1,
    companyProfit: Math.round(v * ((KEEP as any)[k] ?? 1) * 100) / 100,
  }));
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
