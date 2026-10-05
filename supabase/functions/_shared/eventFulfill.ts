// Shared event-ticket fulfillment used after a verified payment (PayPal capture
// or admin-confirmed Cash App). Idempotent per transactionId.
// deno-lint-ignore-file no-explicit-any

const PAYPAL_PERCENT_FEE = 0.0275;
const PAYPAL_FIXED_FEE = 0.50;
const EVENT_OWNER_RATE = 0.70;

export interface EventFulfillInput {
  orderId: string;
  transactionId: string;
  grossAmount: number;
  event_id: string;
  event_owner_id?: string | null;
  buyer_id: string;
  buyer_username?: string | null;
  ticket_type?: string | null;
  ticket_quantity?: number | null;
}

export async function fulfillEventPayment(supabase: any, i: EventFulfillInput) {
  const { data: existingTx } = await supabase
    .from("event_transactions").select("id").eq("paypal_transaction_id", i.transactionId).maybeSingle();
  if (existingTx) return { duplicate: true, payment_id: existingTx.id, ownerEarnings: 0 };

  const grossAmount = i.grossAmount;
  const fee = grossAmount * PAYPAL_PERCENT_FEE + PAYPAL_FIXED_FEE;
  const netAmount = grossAmount - fee;
  const ownerEarnings = netAmount * EVENT_OWNER_RATE;
  const platformFee = netAmount - ownerEarnings;

  const { data: payment } = await supabase
    .from("payments")
    .update({
      payment_status: "completed",
      paypal_payment_id: i.transactionId,
      paypal_transaction_id: i.transactionId,
      platform_fee: platformFee,
      updated_at: new Date().toISOString(),
    })
    .eq("paypal_order_id", i.orderId)
    .select()
    .maybeSingle();

  let ownerId = i.event_owner_id;
  if (!ownerId) {
    const { data: ev } = await supabase.from("events").select("host_user_id").eq("id", i.event_id).maybeSingle();
    ownerId = ev?.host_user_id;
  }

  const { data: eventTx, error: txError } = await supabase
    .from("event_transactions")
    .insert({
      event_id: i.event_id,
      event_owner_id: ownerId,
      buyer_id: i.buyer_id,
      payment_id: payment?.id,
      paypal_transaction_id: i.transactionId,
      amount: grossAmount,
      currency: "USD",
      payment_status: "completed",
    })
    .select()
    .single();
  if (txError) console.error("Failed to create event transaction:", txError);

  const { error: ueErr } = await supabase.from("user_events").upsert(
    {
      user_id: i.buyer_id,
      event_id: i.event_id,
      username: i.buyer_username || "guest",
      payment_status: "paid",
      payment_id: payment?.id,
      ticket_type: i.ticket_type || "general",
      ticket_quantity: i.ticket_quantity || 1,
    },
    { onConflict: "user_id,event_id" },
  );
  if (ueErr) console.error("Failed to add user to event:", ueErr);

  if (ownerId && ownerEarnings > 0) {
    const { error: eErr } = await supabase.from("event_owner_earnings").insert({
      user_id: ownerId,
      event_id: i.event_id,
      transaction_id: eventTx?.id,
      amount: ownerEarnings,
      earnings_type: "ticket_sale",
    });
    if (eErr) console.error("Failed to create earnings record:", eErr);
    const { data: u } = await supabase
      .from("users").select("event_total_earnings, event_available_balance").eq("id", ownerId).single();
    await supabase.from("users").update({
      event_total_earnings: (u?.event_total_earnings || 0) + ownerEarnings,
      event_available_balance: (u?.event_available_balance || 0) + ownerEarnings,
      updated_at: new Date().toISOString(),
    }).eq("id", ownerId);
  }

  await awardEventReferralCommissions(supabase, i.buyer_id, grossAmount, i.event_id, eventTx?.id ?? null);
  return { duplicate: false, payment_id: payment?.id || eventTx?.id, ownerEarnings };
}

// 20% direct + 10% upline commission for event ticket purchases.
// Base = gross - ($0.50 + 2.75%). Idempotent per (referrer, payment_type, transaction_id).
async function awardEventReferralCommissions(
  supabase: any,
  buyerId: string | null | undefined,
  grossAmount: number,
  eventId: string,
  transactionId: string | null,
) {
  try {
    if (!buyerId || !grossAmount || grossAmount <= 0) return;
    const idempKey = transactionId || `${eventId}:${buyerId}`;
    const { data: buyer } = await supabase.from("users").select("id, referred_by").eq("id", buyerId).single();
    if (!buyer?.referred_by) return;
    const referrerUsername = String(buyer.referred_by).trim();
    if (!referrerUsername || referrerUsername.toLowerCase() === "company") return;
    const { data: referrer } = await supabase
      .from("users").select("id, username, referred_by").ilike("username", referrerUsername).maybeSingle();
    if (!referrer) return;

    const net = Math.max(0, Number(grossAmount) - (0.5 + Number(grossAmount) * 0.0275));
    const directAmt = Number((net * 0.20).toFixed(2));
    const uplineAmt = Number((net * 0.10).toFixed(2));

    const now = new Date();
    const dow = now.getDay();
    const daysToMonday = dow === 0 ? 6 : dow - 1;
    const wkStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday);
    const wkEnd = new Date(wkStart);
    wkEnd.setDate(wkStart.getDate() + 6);
    const ymd = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const wkStartStr = ymd(wkStart);
    const wkEndStr = ymd(wkEnd);

    const upsertWeekly = async (uid: string, amount: number) => {
      const { data: existing } = await supabase
        .from("weekly_earnings").select("id, referral_earnings, amount")
        .eq("user_id", uid).eq("week_start", wkStartStr).maybeSingle();
      if (existing) {
        await supabase.from("weekly_earnings").update({
          referral_earnings: Number(existing.referral_earnings || 0) + amount,
          amount: Number(existing.amount || 0) + amount,
          updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await supabase.from("weekly_earnings").insert({
          user_id: uid, week_start: wkStartStr, week_end: wkEndStr, amount,
          tip_earnings: 0, referral_earnings: amount, bonus_earnings: 0,
        });
      }
    };

    const award = async (uid: string, username: string, amt: number, type: string) => {
      const { data: ex } = await supabase.from("payments").select("id")
        .eq("user_id", uid).eq("payment_type", type).eq("paypal_transaction_id", idempKey).maybeSingle();
      if (ex) return;
      const { error } = await supabase.from("payments").insert({
        user_id: uid, event_id: eventId, amount: amt, payment_type: type, payment_status: "completed",
        paypal_transaction_id: idempKey, referred_by: username, referrer_commission: amt,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      });
      if (!error) await upsertWeekly(uid, amt);
      else console.error(`${type} insert failed`, error);
    };

    if (directAmt > 0) await award(referrer.id, referrer.username, directAmt, "event_referral_commission");

    const uplineUsername = String(referrer.referred_by || "").trim();
    if (uplineUsername && uplineUsername.toLowerCase() !== "company" && uplineAmt > 0) {
      const { data: upline } = await supabase
        .from("users").select("id, username").ilike("username", uplineUsername).maybeSingle();
      if (upline?.id) await award(upline.id, upline.username, uplineAmt, "event_upline_referral_commission");
    }
  } catch (e) {
    console.error("awardEventReferralCommissions error", e);
  }
}
