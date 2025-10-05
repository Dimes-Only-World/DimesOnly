// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SOLD_OUT_MESSAGE =
  "Jackpot is maxed out for the upcoming drawing. Tipping will resume at Saturday 12:00 am PST.";

const PERFORMER_RATE = 0.2;
const REFERRER_RATE = 0.1;
const JACKPOT_RATE = 0.25;
const PAYPAL_PERCENT_FEE = 0.015;
const PAYPAL_FIXED_FEE = 0.5;

const MAX_TICKET_FANOUT = 6;
const COMPANY_IDENTIFIERS = new Set(["company"]);

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

const isCompanyReference = (value?: string | null) => {
  if (!value) return false;
  return COMPANY_IDENTIFIERS.has(value.trim().toLowerCase());
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const paypalClientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const paypalClientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    const paypalEnvironment = Deno.env.get("PAYPAL_ENVIRONMENT") || "sandbox";

    console.log("process-tip environment check:", {
      supabaseUrl: supabaseUrl ? "✓ Set" : "✗ Missing",
      serviceRoleKey: serviceRoleKey ? "✓ Set" : "✗ Missing",
      paypalClientId: paypalClientId ? "✓ Set" : "✗ Missing",
      paypalClientSecret: paypalClientSecret ? "✓ Set" : "✗ Missing",
      paypalEnvironment,
    });

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          error:
            "Supabase env vars missing (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();

    const {
      tipper_id,
      tipper_username,
      tipped_username,
      amount,
      message,
      referrer_username,
      paypal_capture_id,
    } = body;

    if (!tipper_id || !tipped_username || amount == null || !paypal_capture_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    const MIN_TIP = 5;
    const MAX_TIP = 1000;
    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount)) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (parsedAmount < MIN_TIP) {
      return new Response(
        JSON.stringify({ error: `Minimum tip is $${MIN_TIP}.` }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    if (parsedAmount > MAX_TIP) {
      return new Response(
        JSON.stringify({ error: `Maximum tip per transaction is $${MAX_TIP}.` }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    const ticketCount = Math.max(0, Math.floor(parsedAmount));

    let poolId: string | null = null;
    let poolStatus: string | null = null;
    let poolMaxTickets: number | null = null;
    let poolCurrentTickets = 0;

    if (ticketCount > 0) {
      try {
        const { data: poolView, error: poolErr } = await supabase
          .from("v_jackpot_active_pool")
          .select("pool_id,status,max_tickets,sales_resume_at,guaranteed_draw")
          .single();

        if (poolErr && poolErr.code !== "PGRST116") {
          throw new Error(`Failed to load active jackpot pool: ${poolErr.message}`);
        }

        if (poolView) {
          poolId = poolView.pool_id ?? null;
          poolStatus = poolView.status ?? null;
          poolMaxTickets = typeof poolView.max_tickets === "number"
            ? poolView.max_tickets
            : null;
        }

        if (!poolId) {
          const { data: fallback, error: fallbackErr } = await supabase
            .from("jackpot_pools")
            .select("id,status,max_tickets")
            .in("status", ["open", "sold_out"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (fallbackErr && fallbackErr.code !== "PGRST116") {
            throw new Error(
              `Fallback pool lookup failed: ${fallbackErr.message}`,
            );
          }

          if (fallback) {
            poolId = fallback.id ?? null;
            poolStatus = fallback.status ?? null;
            poolMaxTickets = typeof fallback.max_tickets === "number"
              ? fallback.max_tickets
              : null;
          }
        }

        if (poolId) {
          const { count, error: countErr } = await supabase
            .from("jackpot_tickets")
            .select("id", { count: "exact", head: true })
            .eq("pool_id", poolId);

          if (countErr) {
            throw new Error(`Failed to count jackpot tickets: ${countErr.message}`);
          }

          poolCurrentTickets = count ?? 0;

          if (
            poolStatus === "sold_out" ||
            (poolMaxTickets !== null && poolCurrentTickets >= poolMaxTickets)
          ) {
            return new Response(JSON.stringify({ error: SOLD_OUT_MESSAGE }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 409,
            });
          }

          if (
            poolMaxTickets !== null &&
            poolCurrentTickets + ticketCount * MAX_TICKET_FANOUT > poolMaxTickets
          ) {
            return new Response(JSON.stringify({ error: SOLD_OUT_MESSAGE }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 409,
            });
          }
        }
      } catch (poolCheckErr) {
        console.error("Jackpot pool availability check failed:", poolCheckErr);
        return new Response(
          JSON.stringify({
            error:
              "Jackpot ticket sales are unavailable right now. Please try again later.",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 503,
          },
        );
      }
    }

    const { data: tippedUser, error: tippedErr } = await supabase
      .from("users")
      .select("id, username, referred_by")
      .eq("username", tipped_username)
      .single();

    if (tippedErr || !tippedUser) {
      throw new Error("Tipped user not found");
    }

    const { data: tipperUser, error: tipperErr } = await supabase
      .from("users")
      .select("id, username, referred_by")
      .eq("id", tipper_id)
      .single();

    if (tipperErr || !tipperUser) {
      throw new Error("Tipper user not found");
    }

    const fetchUserByUsername = async (username?: string | null) => {
      if (!username) return null;
      const cleaned = username.trim();
      if (!cleaned) return null;

      const { data, error } = await supabase
        .from("users")
        .select("id, username, referred_by")
        .eq("username", cleaned)
        .maybeSingle();

      if (error) {
        console.error("User lookup failed", { username: cleaned, error });
        return null;
      }

      return data ?? null;
    };

    let referrerUsername: string | null =
      typeof referrer_username === "string" ? referrer_username.trim() : null;
    if (referrerUsername && !referrerUsername.length) {
      referrerUsername = null;
    }

    if (
      !referrerUsername &&
      tippedUser.referred_by &&
      !isCompanyReference(tippedUser.referred_by)
    ) {
      const fallback = tippedUser.referred_by.trim();
      referrerUsername = fallback.length ? fallback : null;
    }

    const percentFee = roundCurrency(parsedAmount * PAYPAL_PERCENT_FEE);
    const paypalFeeAmount = roundCurrency(percentFee + PAYPAL_FIXED_FEE);
    const netBase = Math.max(0, roundCurrency(parsedAmount - paypalFeeAmount));

    const performerShare = roundCurrency(netBase * PERFORMER_RATE);
    let refCommission = referrerUsername
      ? roundCurrency(netBase * REFERRER_RATE)
      : 0;
    const jackpotContribution = roundCurrency(netBase * JACKPOT_RATE);
    let companyShare = roundCurrency(
      netBase - performerShare - refCommission - jackpotContribution,
    );

    let refUserId: string | null = null;
    if (referrerUsername && refCommission > 0) {
      const { data: refUser, error: refErr } = await supabase
        .from("users")
        .select("id")
        .eq("username", referrerUsername)
        .maybeSingle();

      if (refErr) {
        console.error("Referrer lookup error", refErr);
      }

      refUserId = refUser?.id ?? null;

      if (!refUserId) {
        refCommission = 0;
        companyShare = roundCurrency(
          netBase - performerShare - jackpotContribution,
        );
      }
    }

    const allocatedTotal = roundCurrency(
      paypalFeeAmount +
        performerShare +
        refCommission +
        jackpotContribution +
        companyShare,
    );

    const allocationDelta = roundCurrency(parsedAmount - allocatedTotal);
    if (allocationDelta !== 0) {
      companyShare = roundCurrency(companyShare + allocationDelta);
    }

    const { data: payment, error: payErr } = await supabase
      .from("payments")
      .insert({
        user_id: tipper_id,
        amount: parsedAmount,
        payment_status: "completed",
        payment_type: "tip",
        paypal_transaction_id: paypal_capture_id,
        referred_by: referrerUsername,
        referrer_commission: refCommission,
      })
      .select()
      .single();

    if (payErr) throw new Error(payErr.message);

    const { data: tipRow, error: tipErr } = await supabase
      .from("tips")
      .insert({
        tipper_username: tipper_username || "anonymous",
        tipped_username,
        user_id: tipper_id,
        tip_amount: performerShare,
        tickets_generated: ticketCount,
        paypal_transaction_id: paypal_capture_id,
        referrer_username: referrerUsername,
        status: "completed",
      })
      .select()
      .single();

    if (tipErr) throw new Error(tipErr.message);

    const { error: tipTxnErr } = await supabase
      .from("tips_transactions")
      .insert({
        tipper_user_id: tipper_id,
        tipped_user_id: tippedUser.id,
        tipped_username,
        tip_amount: performerShare,
        payment_method: "paypal",
        payment_id: payment.id,
        payment_status: "completed",
        paypal_order_id: paypal_capture_id,
        referrer_username: referrerUsername,
        referrer_commission: refCommission,
        tickets_generated: ticketCount,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (tipTxnErr) throw new Error(tipTxnErr.message);

    const earnedAt = tipRow?.created_at
      ? new Date(tipRow.created_at)
      : new Date();

    try {
      await upsertWeeklyEarnings(
        supabase,
        tippedUser.id,
        earnedAt,
        performerShare,
        0,
        0,
      );

      if (refUserId && refCommission > 0) {
        await upsertWeeklyEarnings(
          supabase,
          refUserId,
          earnedAt,
          0,
          refCommission,
          0,
        );
      }
    } catch (weeklyErr) {
      console.error("weekly_earnings upsert failed", weeklyErr);
    }

    const performerRefUser = await fetchUserByUsername(
      tippedUser.referred_by ?? null,
    );

    const performerRefRefUser =
      performerRefUser && !isCompanyReference(performerRefUser.referred_by)
        ? await fetchUserByUsername(performerRefUser.referred_by ?? null)
        : null;

    const tipperRefUser = !isCompanyReference(tipperUser.referred_by)
      ? await fetchUserByUsername(tipperUser.referred_by ?? null)
      : null;

    type PrizeSlot =
      | "grand_prize_tipper"
      | "grand_prize_dime"
      | "grand_prize_dime_referrer"
      | "second_place_referrer"
      | "second_place_super_referrer"
      | "third_place_referrer";

    const prizeRecipients: { slot: PrizeSlot; userId: string }[] = [
      { slot: "grand_prize_tipper", userId: tipperUser.id },
      { slot: "grand_prize_dime", userId: tippedUser.id },
    ];

    if (performerRefUser?.id) {
      prizeRecipients.push(
        { slot: "grand_prize_dime_referrer", userId: performerRefUser.id },
        { slot: "second_place_referrer", userId: performerRefUser.id },
      );
    }

    if (performerRefRefUser?.id) {
      prizeRecipients.push({
        slot: "second_place_super_referrer",
        userId: performerRefRefUser.id,
      });
    }

    if (tipperRefUser?.id) {
      prizeRecipients.push({
        slot: "third_place_referrer",
        userId: tipperRefUser.id,
      });
    }

    const ticketCodes: string[] = [];

    if (ticketCount > 0) {
      const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const CODE_LEN = 5;
      const batchCodes = new Set<string>();

      const makeUniqueCode = () => {
        const picked = new Set<string>();
        while (picked.size < CODE_LEN) {
          const ch = ALPHA.charAt(Math.floor(Math.random() * ALPHA.length));
          picked.add(ch);
        }
        return Array.from(picked).join("");
      };

      while (ticketCodes.length < ticketCount) {
        const code = makeUniqueCode();
        if (!batchCodes.has(code)) {
          batchCodes.add(code);
          ticketCodes.push(code);
        }
      }
    }

    if (ticketCodes.length) {
      const ticketRows = ticketCodes.map((code) => ({
        ticket_number: code,
        tip_id: tipRow.id,
        user_Id: tipper_id,
        username: tipper_username || "anonymous",
      }));

      const { error: tErr } = await supabase.from("tickets").insert(ticketRows);
      if (tErr) console.error("tickets insert error", tErr);
    }

    if (!poolId && ticketCodes.length) {
      const { data: poolRow } = await supabase
        .from("jackpot_pools")
        .select("id")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      poolId = poolRow?.id ?? null;
    }

    if (poolId && ticketCodes.length && prizeRecipients.length) {
      const jtRows = prizeRecipients.flatMap(({ slot, userId }) =>
        ticketCodes.map((code) => ({
          code,
          pool_id: poolId,
          tip_id: tipRow.id,
          tipper_id: tipperUser.id,
          tipped_user_id: tippedUser.id,
          user_id: userId,
          dime_id: tippedUser.id,
          referred_dime_id:
            slot === "grand_prize_dime_referrer" || slot === "second_place_referrer"
              ? tippedUser.id
              : slot === "second_place_super_referrer"
              ? performerRefUser?.id ?? null
              : null,
          source: slot,
          source_transaction_id: payment.id,
          tickets_count: 1,
        })),
      );

      const { error: jtErr } = await supabase
        .from("jackpot_tickets")
        .insert(jtRows);

      if (jtErr) {
        console.error("jackpot_tickets insert error", jtErr);
      } else if (poolMaxTickets !== null) {
        const newTotal = poolCurrentTickets + jtRows.length;
        if (newTotal >= poolMaxTickets) {
          const nowIso = new Date().toISOString();
          let salesResumeAt: string | null = null;

          const { data: resumeData, error: resumeErr } = await supabase.rpc(
            "jackpot_next_sales_start",
            { now_ts: nowIso },
          );

          if (!resumeErr && resumeData) {
            salesResumeAt = resumeData;
          }

          const { error: poolUpdateErr } = await supabase
            .from("jackpot_pools")
            .update({
              status: "sold_out",
              sold_out_at: nowIso,
              sales_resume_at: salesResumeAt,
              guaranteed_draw: true,
            })
            .eq("id", poolId);

          if (poolUpdateErr) {
            console.error(
              "Failed to mark jackpot pool as sold out",
              poolUpdateErr,
            );
          }
        }
      }
    } else if (!poolId) {
      console.warn("No active pool found; skipping jackpot_tickets insert");
    }

    if (poolId) {
      const { data: poolAmountRow, error: poolAmountErr } = await supabase
        .from("jackpot_pools")
        .select("current_amount")
        .eq("id", poolId)
        .maybeSingle();

      if (poolAmountErr) {
        console.error("jackpot_pools amount fetch error", poolAmountErr);
      } else {
        const currentAmount = Number(poolAmountRow?.current_amount || 0);
        const nextAmount = roundCurrency(currentAmount + jackpotContribution);

        const { error: poolUpdateErr } = await supabase
          .from("jackpot_pools")
          .update({ current_amount: nextAmount })
          .eq("id", poolId);

        if (poolUpdateErr) {
          console.error("jackpot_pools amount update error", poolUpdateErr);
        }
      }
    }

    const { error: ledgerErr } = await supabase
      .from("jackpot_ledger")
      .insert({
        tip_id: tipRow.id,
        tipper_id,
        dime_id: tippedUser.id,
        referred_dime_id: refUserId,
        gross_amount: parsedAmount,
        fee_percent: PAYPAL_PERCENT_FEE,
        fee_fixed: PAYPAL_FIXED_FEE,
        fee_amount: paypalFeeAmount,
        to_dime: performerShare,
        to_referred_dime: refCommission,
        to_jackpot: jackpotContribution,
        to_company: companyShare,
      });

    if (ledgerErr) {
      console.error("jackpot_ledger insert error", ledgerErr);
    }

    if (refUserId && refCommission > 0) {
      const { error: payoutErr } = await supabase
        .from("commission_payouts")
        .insert({
          user_id: refUserId,
          amount: refCommission,
          commission_type: "tip_referral",
          payout_status: "pending",
          source_payment_id: payment.id,
        });

      if (payoutErr) {
        console.error("commission_payouts insert error", payoutErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, ticket_codes: ticketCodes }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function upsertWeeklyEarnings(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  when: Date,
  tipDelta: number,
  referralDelta: number,
  bonusDelta: number,
) {
  if (!userId) return;

  const { start, end } = getPayPeriodRange(when);

  const { data: existing, error: readErr } = await supabase
    .from("weekly_earnings")
    .select("id, tip_earnings, referral_earnings, bonus_earnings, amount")
    .eq("user_id", userId)
    .eq("week_start", start)
    .maybeSingle();

  if (readErr) throw readErr;

  const nextTip = roundCurrency((existing?.tip_earnings || 0) + tipDelta);
  const nextReferral = roundCurrency(
    (existing?.referral_earnings || 0) + referralDelta,
  );
  const nextBonus = roundCurrency((existing?.bonus_earnings || 0) + bonusDelta);
  const nextAmount = roundCurrency(
    (existing?.amount || 0) + tipDelta + referralDelta + bonusDelta,
  );

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

    if (updateErr) throw updateErr;
  } else {
    const insertPayload = {
      user_id: userId,
      ...basePayload,
      created_at: new Date().toISOString(),
    };
    const { error: insertErr } = await supabase
      .from("weekly_earnings")
      .insert(insertPayload);

    if (insertErr) throw insertErr;
  }
}

function getPayPeriodRange(at: Date) {
  const year = at.getUTCFullYear();
  const month = at.getUTCMonth();
  const day = at.getUTCDate();

  const start =
    day <= 15
      ? new Date(Date.UTC(year, month, 1))
      : new Date(Date.UTC(year, month, 16));
  const end =
    day <= 15
      ? new Date(Date.UTC(year, month, 15))
      : new Date(Date.UTC(year, month + 1, 0));

  return {
    start: formatDateString(start),
    end: formatDateString(end),
  };
}

function formatDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getNextDrawDate() {
  const now = new Date();
  const next = new Date(now);
  const daysUntilSunday = (7 - now.getDay()) % 7;
  next.setDate(now.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
  next.setHours(21, 0, 0, 0);
  return next.toISOString();
}