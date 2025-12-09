import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Allocation rates - must match process-tip function
const PERFORMER_RATE = 0.2;      // 20% to dime (performer)
const REFERRER_RATE = 0.1;       // 10% to referrer
const JACKPOT_RATE = 0.25;       // 25% to jackpot
const PAYPAL_PERCENT_FEE = 0.015; // 1.5% PayPal fee
const PAYPAL_FIXED_FEE = 0.5;    // $0.50 fixed PayPal fee

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    console.log("Tip webhook received:", JSON.stringify(body, null, 2));

    const { event_type, resource } = body;

    if (event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const paypalOrderId = resource.id;
      const grossAmount = parseFloat(resource.amount.value);
      
      let customData;
      try {
        customData = JSON.parse(resource.custom_id || "{}");
      } catch {
        console.error("Failed to parse custom_id:", resource.custom_id);
        customData = {};
      }

      const {
        tipped_username,
        referrer_username,
        tipper_username,
      } = customData;

      console.log("Processing tip payment:", {
        paypalOrderId,
        grossAmount,
        tipped_username,
        referrer_username,
        tipper_username,
      });

      // Validate required fields
      if (!tipped_username || !tipper_username || grossAmount <= 0) {
        console.error("Missing required fields in webhook data");
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Get tipped user
      const { data: tippedUser, error: tippedUserError } = await supabase
        .from("users")
        .select("id, username, referred_by")
        .eq("username", tipped_username)
        .single();

      if (tippedUserError || !tippedUser) {
        console.error("Error finding tipped user:", tippedUserError);
        throw new Error("Tipped user not found");
      }

      // Get tipper user
      const { data: tipperUser, error: tipperUserError } = await supabase
        .from("users")
        .select("id, username, referred_by")
        .eq("username", tipper_username)
        .single();

      if (tipperUserError || !tipperUser) {
        console.error("Error finding tipper user:", tipperUserError);
        throw new Error("Tipper user not found");
      }

      // Determine referrer - use provided referrer_username or fall back to tipped user's referrer
      const effectiveReferrerUsername = referrer_username || tippedUser.referred_by || null;

      // Calculate allocations
      const percentFee = roundCurrency(grossAmount * PAYPAL_PERCENT_FEE);
      const paypalFeeAmount = roundCurrency(percentFee + PAYPAL_FIXED_FEE);
      const netBase = Math.max(0, roundCurrency(grossAmount - paypalFeeAmount));

      const performerShare = roundCurrency(netBase * PERFORMER_RATE);
      let referrerCommission = effectiveReferrerUsername ? roundCurrency(netBase * REFERRER_RATE) : 0;
      const jackpotContribution = roundCurrency(netBase * JACKPOT_RATE);
      let companyShare = roundCurrency(netBase - performerShare - referrerCommission - jackpotContribution);

      // Lookup referrer user ID
      let referrerUserId: string | null = null;
      if (effectiveReferrerUsername && referrerCommission > 0) {
        const { data: refUser } = await supabase
          .from("users")
          .select("id")
          .eq("username", effectiveReferrerUsername)
          .maybeSingle();

        referrerUserId = refUser?.id ?? null;

        // If referrer not found, redistribute their share to company
        if (!referrerUserId) {
          companyShare = roundCurrency(companyShare + referrerCommission);
          referrerCommission = 0;
        }
      }

      // Fix any rounding discrepancies - ensure total equals gross amount
      const allocatedTotal = roundCurrency(paypalFeeAmount + performerShare + referrerCommission + jackpotContribution + companyShare);
      const allocationDelta = roundCurrency(grossAmount - allocatedTotal);
      if (allocationDelta !== 0) {
        companyShare = roundCurrency(companyShare + allocationDelta);
      }

      console.log("Tip allocation breakdown:", {
        grossAmount,
        paypalFeeAmount,
        netBase,
        performerShare,
        referrerCommission,
        jackpotContribution,
        companyShare,
        referrerUserId,
      });

      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .insert({
          user_id: tipperUser.id,
          amount: grossAmount,
          payment_status: "completed",
          payment_type: "tip",
          paypal_order_id: paypalOrderId,
          referred_by: effectiveReferrerUsername,
          referrer_commission: referrerCommission,
          platform_fee: paypalFeeAmount,
        })
        .select()
        .single();

      if (paymentError) {
        console.error("Error creating payment:", paymentError);
        throw new Error("Failed to create payment record");
      }

      // Calculate ticket count (1 per whole dollar of gross amount)
      const ticketCount = Math.max(0, Math.floor(grossAmount));

      // Create tip record
      const { data: tipRow, error: tipError } = await supabase
        .from("tips")
        .insert({
          tipper_username: tipper_username,
          tipped_username: tipped_username,
          user_id: tipperUser.id,
          tip_amount: performerShare,
          tickets_generated: ticketCount,
          paypal_transaction_id: paypalOrderId,
          referrer_username: effectiveReferrerUsername,
          status: "completed",
        })
        .select()
        .single();

      if (tipError) {
        console.error("Error creating tip:", tipError);
        throw new Error("Failed to create tip record");
      }

      // Create tip transaction record
      const { error: tipTxnError } = await supabase
        .from("tips_transactions")
        .insert({
          tipper_user_id: tipperUser.id,
          tipped_user_id: tippedUser.id,
          tipped_username: tipped_username,
          tip_amount: performerShare,
          payment_method: "paypal",
          payment_id: payment.id,
          payment_status: "completed",
          paypal_order_id: paypalOrderId,
          referrer_username: effectiveReferrerUsername,
          referrer_commission: referrerCommission,
          tickets_generated: ticketCount,
          completed_at: new Date().toISOString(),
        });

      if (tipTxnError) {
        console.error("Error creating tip transaction:", tipTxnError);
        throw new Error("Failed to create tip transaction");
      }

      // Update performer's tips_earned in users table
      const { error: performerUpdateError } = await supabase.rpc(
        "increment_tips_earned",
        { p_user_id: tippedUser.id, p_amount: performerShare }
      );
      
      if (performerUpdateError) {
        console.error("Error updating performer tips_earned:", performerUpdateError);
        // Don't throw - this is not critical
      }

      // Update weekly earnings for performer
      await upsertWeeklyEarnings(supabase, tippedUser.id, new Date(), performerShare, 0, 0);

      // Create jackpot ledger entry
      const { error: ledgerError } = await supabase
        .from("jackpot_ledger")
        .insert({
          tip_id: tipRow.id,
          tipper_id: tipperUser.id,
          dime_id: tippedUser.id,
          referred_dime_id: referrerUserId,
          gross_amount: grossAmount,
          fee_percent: PAYPAL_PERCENT_FEE * 100, // Store as percentage
          fee_fixed: PAYPAL_FIXED_FEE,
          fee_amount: paypalFeeAmount,
          to_dime: performerShare,
          to_referred_dime: referrerCommission,
          to_jackpot: jackpotContribution,
          to_company: companyShare,
        });

      if (ledgerError) {
        console.error("Error creating jackpot ledger entry:", ledgerError);
      }

      // Get or create active jackpot pool
      const { data: poolData } = await supabase
        .from("jackpot_pools")
        .select("id, current_amount")
        .in("status", ["open", "ready"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (poolData) {
        // Update jackpot pool amount
        const newAmount = roundCurrency((poolData.current_amount || 0) + jackpotContribution);
        const { error: poolUpdateError } = await supabase
          .from("jackpot_pools")
          .update({ current_amount: newAmount })
          .eq("id", poolData.id);

        if (poolUpdateError) {
          console.error("Error updating jackpot pool:", poolUpdateError);
        }

        // Create jackpot tickets
        if (ticketCount > 0) {
          const tickets = [];
          for (let i = 0; i < ticketCount; i++) {
            tickets.push({
              pool_id: poolData.id,
              tip_id: tipRow.id,
              tipper_id: tipperUser.id,
              tipped_user_id: tippedUser.id,
              dime_id: tippedUser.id,
              referred_dime_id: referrerUserId,
              user_id: tipperUser.id,
              tickets_count: 1,
              code: generateTicketCode(),
              draw_date: getNextDrawDate(),
              source: "tip",
              source_transaction_id: payment.id,
            });
          }

          const { error: ticketsError } = await supabase
            .from("jackpot_tickets")
            .insert(tickets);

          if (ticketsError) {
            console.error("Error creating jackpot tickets:", ticketsError);
          }
        }
      }

      // Add referrer commission payout if applicable
      if (referrerUserId && referrerCommission > 0) {
        const { error: commissionError } = await supabase
          .from("commission_payouts")
          .insert({
            user_id: referrerUserId,
            payment_id: payment.id,
            amount: referrerCommission,
            commission_type: "tip_referral",
            payout_status: "pending",
          });

        if (commissionError) {
          console.error("Error creating referrer commission:", commissionError);
        }

        // Update referrer's weekly earnings
        await upsertWeeklyEarnings(supabase, referrerUserId, new Date(), 0, referrerCommission, 0);
      }

      console.log("Tip processing completed successfully", {
        payment_id: payment.id,
        tip_id: tipRow.id,
        grossAmount,
        performerShare,
        referrerCommission,
        jackpotContribution,
        companyShare,
        ticketCount,
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "Tip processed successfully",
          payment_id: payment.id,
          tip_id: tipRow.id,
          allocation: {
            gross: grossAmount,
            paypal_fee: paypalFeeAmount,
            performer: performerShare,
            referrer: referrerCommission,
            jackpot: jackpotContribution,
            company: companyShare,
          },
          tickets_generated: ticketCount,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify({ message: "Event type not handled", event_type }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

// Helper: Generate unique 5-letter ticket code
function generateTicketCode(): string {
  const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const picked = new Set<string>();
  while (picked.size < 5) {
    const ch = ALPHA.charAt(Math.floor(Math.random() * ALPHA.length));
    picked.add(ch);
  }
  return Array.from(picked).join("");
}

// Helper: Get next Saturday draw date
function getNextDrawDate(): string {
  const now = new Date();
  const next = new Date(now);
  const daysUntilSaturday = (6 - now.getDay() + 7) % 7;
  next.setDate(now.getDate() + (daysUntilSaturday === 0 ? 7 : daysUntilSaturday));
  next.setUTCHours(0, 0, 0, 0);
  return next.toISOString().slice(0, 10);
}

// Helper: Round currency to 2 decimal places
const roundCurrencyHelper = (value: number) => Math.round(value * 100) / 100;

// Helper: Upsert weekly earnings
async function upsertWeeklyEarnings(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  when: Date,
  tipDelta: number,
  referralDelta: number,
  bonusDelta: number
) {
  if (!userId) return;

  const { start, end } = getPayPeriodRange(when);

  const { data: existing, error: readErr } = await supabase
    .from("weekly_earnings")
    .select("id, tip_earnings, referral_earnings, bonus_earnings, amount")
    .eq("user_id", userId)
    .eq("week_start", start)
    .maybeSingle();

  if (readErr) {
    console.error("Error reading weekly earnings:", readErr);
    return;
  }

  const nextTip = roundCurrencyHelper((existing?.tip_earnings || 0) + tipDelta);
  const nextReferral = roundCurrencyHelper((existing?.referral_earnings || 0) + referralDelta);
  const nextBonus = roundCurrencyHelper((existing?.bonus_earnings || 0) + bonusDelta);
  const nextAmount = roundCurrencyHelper((existing?.amount || 0) + tipDelta + referralDelta + bonusDelta);

  const basePayload = {
    week_start: start,
    week_end: end,
    tip_earnings: nextTip,
    referral_earnings: nextReferral,
    bonus_earnings: nextBonus,
    amount: nextAmount,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error: updateErr } = await supabase
      .from("weekly_earnings")
      .update(basePayload)
      .eq("id", existing.id);

    if (updateErr) {
      console.error("Error updating weekly earnings:", updateErr);
    }
  } else {
    const { error: insertErr } = await supabase
      .from("weekly_earnings")
      .insert({
        user_id: userId,
        ...basePayload,
        created_at: new Date().toISOString(),
      });

    if (insertErr) {
      console.error("Error inserting weekly earnings:", insertErr);
    }
  }
}

// Helper: Get pay period range (1st-15th or 16th-end of month)
function getPayPeriodRange(at: Date) {
  const year = at.getUTCFullYear();
  const month = at.getUTCMonth();
  const day = at.getUTCDate();

  const start = day <= 15
    ? new Date(Date.UTC(year, month, 1))
    : new Date(Date.UTC(year, month, 16));
  const end = day <= 15
    ? new Date(Date.UTC(year, month, 15))
    : new Date(Date.UTC(year, month + 1, 0));

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}
