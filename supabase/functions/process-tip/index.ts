// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

    if (!tipper_id || !tipped_username || !amount || !paypal_capture_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { headers: corsHeaders, status: 400 }
      );
    }

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
        amount,
        payment_status: "completed",
        payment_type: "tip",
        paypal_transaction_id: paypal_capture_id,
        referred_by: referrer_username || null,
      })
      .select()
      .single();

    if (payErr) throw new Error(payErr.message);

    // commissions
    const refCommission = referrer_username ? amount * 0.2 : 0;

    // basic tip row and capture id
    const { data: tipRow, error: tipErr } = await supabase
      .from("tips")
      .insert({
        tipper_username: tipper_username || "anonymous",
        tipped_username,
        user_id: tipper_id,
        tip_amount: amount,
        tickets_generated: Math.floor(amount),
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
        tip_amount: amount,
        payment_method: "paypal",
        payment_id: payment.id,
        payment_status: "completed",
        paypal_order_id: paypal_capture_id,
        referrer_username: referrer_username || null,
        referrer_commission: refCommission,
        tickets_generated: Math.floor(amount),
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (tipTxnErr) throw new Error(tipTxnErr.message);

    // Generate ticket codes
    const ticketCodes: string[] = [];
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for (let i = 0; i < Math.floor(amount); i++) {
      let code = "";
      for (let j = 0; j < 7; j++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      ticketCodes.push(code);
    }

    // Insert into tickets table
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

    // Insert aggregate row into jackpot_tickets
    const { error: jpErr } = await supabase.from("jackpot_tickets").insert({
      user_id: tipper_id,
      tip_id: tipRow.id,
      tickets_count: Math.floor(amount),
      draw_date: getNextDrawDate(),
    });
    if (jpErr) console.error("jackpot_tickets insert error", jpErr);

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
