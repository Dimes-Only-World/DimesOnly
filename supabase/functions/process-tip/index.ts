// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const {
      tipper_id,
      tipper_username,
      tipped_username,
      amount,
      message,
      referrer_username,
      paypal_capture_id,
    } = body as {
      tipper_id: string;
      tipper_username?: string;
      tipped_username: string;
      amount: number;
      message?: string;
      referrer_username?: string;
      paypal_capture_id: string;
    };

    // Basic presence checks
    if (!tipper_id || !tipped_username || amount == null || !paypal_capture_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        headers: corsHeaders,
        status: 400,
      });
    }

    // Numeric validation and business rules
    const MIN_TIP = 5;
    const MAX_TIP = 1000;

    // Ensure amount is a finite number
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount)) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        headers: corsHeaders,
        status: 400,
      });
    }

    if (parsedAmount < MIN_TIP) {
      return new Response(
        JSON.stringify({ error: `Minimum tip is $${MIN_TIP}.` }),
        { headers: corsHeaders, status: 400 }
      );
    }

    if (parsedAmount > MAX_TIP) {
      return new Response(
        JSON.stringify({ error: `Maximum tip per transaction is $${MAX_TIP}.` }),
        { headers: corsHeaders, status: 400 }
      );
    }

    // Tickets are whole dollars only
    const ticketCount = Math.max(0, Math.floor(parsedAmount));

    // Fetch tipped user ID
    const { data: tippedUser, error: tippedErr } = await supabase
      .from("users")
      .select("id")
      .eq("username", tipped_username)
      .single();

    if (tippedErr || !tippedUser) throw new Error("Tipped user not found");

    // Record payment
    const { data: payment, error: payErr } = await supabase
      .from("payments")
      .insert({
        user_id: tipper_id,
        amount: parsedAmount,
        payment_status: "completed",
        payment_type: "tip",
        paypal_transaction_id: paypal_capture_id,
        referred_by: referrer_username || null,
      })
      .select()
      .single();

    if (payErr) throw new Error(payErr.message);

    // commissions
    const refCommission = referrer_username ? parsedAmount * 0.2 : 0;

    // basic tip row and capture id
    const { data: tipRow, error: tipErr } = await supabase
      .from("tips")
      .insert({
        tipper_username: tipper_username || "anonymous",
        tipped_username,
        user_id: tipper_id,
        tip_amount: parsedAmount,
        tickets_generated: ticketCount,
        paypal_transaction_id: paypal_capture_id,
        referrer_username: referrer_username || null,
        status: "completed",
      })
      .select()
      .single();

    if (tipErr) throw new Error(tipErr.message);

    // tip transaction history (uses tipRow.id as foreign ref later)
    const { data: tipTxn, error: tipTxnErr } = await supabase
      .from("tips_transactions")
      .insert({
        tipper_user_id: tipper_id,
        tipped_user_id: tippedUser.id,
        tipped_username,
        tip_amount: parsedAmount,
        payment_method: "paypal",
        payment_id: payment.id,
        payment_status: "completed",
        paypal_order_id: paypal_capture_id,
        referrer_username: referrer_username || null,
        referrer_commission: refCommission,
        tickets_generated: ticketCount,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (tipTxnErr) throw new Error(tipTxnErr.message);

    // Generate ticket codes (MUST match DB constraint: ^[A-Z]{5}$)
    const ticketCodes: string[] = [];
    if (ticketCount > 0) {
      const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const CODE_LEN = 5; // exactly 5 letters
      for (let i = 0; i < ticketCount; i++) {
        let code = "";
        for (let j = 0; j < CODE_LEN; j++) {
          code += ALPHA.charAt(Math.floor(Math.random() * ALPHA.length));
        }
        ticketCodes.push(code);
      }
    }

    // Keep the legacy 'tickets' table insert (no changes)
    if (ticketCodes.length) {
      const ticketRows = ticketCodes.map((code) => ({
        ticket_number: code,
        tip_id: tipRow.id,
        user_Id: tipper_id, // preserved casing per your existing schema
        username: tipper_username || "anonymous",
      }));
      const { error: tErr } = await supabase.from("tickets").insert(ticketRows);
      if (tErr) console.error("tickets insert error", tErr);
    }

    // Determine active pool_id for jackpot_tickets so the UI can display codes
    let poolId: string | null = null;
    try {
      const { data: poolView, error: pvErr } = await supabase
        .from("v_jackpot_active_pool")
        .select("pool_id")
        .single();
      if (!pvErr && poolView?.pool_id) {
        poolId = poolView.pool_id;
      }
    } catch (_) {
      // ignore and fallback
    }
    if (!poolId) {
      const { data: poolRow } = await supabase
        .from("jackpot_pools")
        .select("id")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      poolId = poolRow?.id || null;
    }

    // Insert individual rows in jackpot_tickets so UserJackpotTab.tsx can query by tipper_id + pool_id and read 'code'
    if (poolId && ticketCodes.length) {
      const jtRows = ticketCodes.map((code) => ({
        code,
        tipper_id: tipper_id,
        pool_id: poolId,
        // created_at default now() via DB
      }));
      const { error: jtErr } = await supabase.from("jackpot_tickets").insert(jtRows);
      if (jtErr) {
        console.error("jackpot_tickets insert error", jtErr);
      }
    } else if (!poolId) {
      console.warn("No active pool found; skipping jackpot_tickets insert");
    }

    // Referrer commission
    if (referrer_username && refCommission > 0) {
      const { data: refUser } = await supabase
        .from("users")
        .select("id")
        .eq("username", referrer_username)
        .single();
      if (refUser) {
        await supabase.from("commission_payouts").insert({
          user_id: refUser.id,
          amount: refCommission,
          commission_type: "tip_referral",
          payout_status: "pending",
          source_payment_id: payment.id,
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, ticket_codes: ticketCodes }),
      { headers: corsHeaders, status: 200 }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: corsHeaders,
      status: 500,
    });
  }
});

function getNextDrawDate(): string {
  const now = new Date();
  const next = new Date(now);
  const daysUntilSunday = (7 - now.getDay()) % 7;
  next.setDate(now.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
  next.setHours(21, 0, 0, 0);
  return next.toISOString();
}