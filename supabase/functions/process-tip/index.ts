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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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
        { headers: corsHeaders, status: 400 },
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
        { headers: corsHeaders, status: 400 },
      );
    }

    if (parsedAmount > MAX_TIP) {
      return new Response(
        JSON.stringify({ error: `Maximum tip per transaction is $${MAX_TIP}.` }),
        { headers: corsHeaders, status: 400 },
      );
    }

    // Tickets are whole dollars only
    const ticketCount = Math.max(0, Math.floor(parsedAmount));

    // Active pool + cap enforcement (before recording payment)
    let poolId: string | null = null;
    let poolStatus: string | null = null;
    let poolMaxTickets: number | null = null;
    let poolCurrentTickets = 0;

    if (ticketCount > 0) {
      try {
        const {
          data: poolView,
          error: poolErr,
        } = await supabase
          .from("v_jackpot_active_pool")
          .select(
            "pool_id,status,max_tickets,sales_resume_at,guaranteed_draw",
          )
          .single();

        if (poolErr && poolErr.code !== "PGRST116") {
          throw new Error(
            `Failed to load active jackpot pool: ${poolErr.message}`,
          );
        }

        if (poolView) {
          poolId = poolView.pool_id ?? null;
          poolStatus = poolView.status ?? null;
          poolMaxTickets =
            typeof poolView.max_tickets === "number"
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
            poolMaxTickets =
              typeof fallback.max_tickets === "number"
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
            throw new Error(
              `Failed to count jackpot tickets: ${countErr.message}`,
            );
          }

          poolCurrentTickets = count ?? 0;

          if (
            poolStatus === "sold_out" ||
            (poolMaxTickets !== null && poolCurrentTickets >= poolMaxTickets)
          ) {
            return new Response(
              JSON.stringify({ error: SOLD_OUT_MESSAGE }),
              { headers: corsHeaders, status: 409 },
            );
          }

          if (
            poolMaxTickets !== null &&
            poolCurrentTickets + ticketCount > poolMaxTickets
          ) {
            return new Response(
              JSON.stringify({ error: SOLD_OUT_MESSAGE }),
              { headers: corsHeaders, status: 409 },
            );
          }
        }
      } catch (poolCheckErr) {
        console.error(
          "Jackpot pool availability check failed:",
          poolCheckErr,
        );
        return new Response(
          JSON.stringify({
            error:
              "Jackpot ticket sales are unavailable right now. Please try again later.",
          }),
          { headers: corsHeaders, status: 503 },
        );
      }
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
        amount: parsedAmount,
        payment_status: "completed",
        payment_type: "tip",
        paypal_transaction_id: paypal_capture_id,
        referred_by: referrer_username || null,
      })
      .select()
      .single();

    if (payErr) throw new Error(payErr.message);

    const refCommission = referrer_username ? parsedAmount * 0.2 : 0;

    // Basic tip row
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

    // Tip transaction history
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

    // Generate ticket codes
    const ticketCodes: string[] = [];
    if (ticketCount > 0) {
      const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const CODE_LEN = 5;
      const batchCodes = new Set<string>();

      const makeUniqueCode = (): string => {
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

    // Keep legacy tickets insert
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

    // Ensure we have a pool id before jackpot insert (fallback if necessary)
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

    if (poolId && ticketCodes.length) {
      const jtRows = ticketCodes.map((code) => ({
        code,
        tipper_id: tipper_id,
        tipped_user_id: tippedUser.id,
        pool_id: poolId!,
      }));
      const { error: jtErr } = await supabase.from("jackpot_tickets").insert(
        jtRows,
      );
      if (jtErr) console.error("jackpot_tickets insert error", jtErr);
      else if (poolMaxTickets !== null) {
        const newTotal = poolCurrentTickets + ticketCodes.length;
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
            console.error("Failed to mark jackpot pool as sold out", poolUpdateErr);
          }
        }
      }
    } else if (!poolId) {
      console.warn("No active pool found; skipping jackpot_tickets insert");
    }

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
      { headers: corsHeaders, status: 200 },
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