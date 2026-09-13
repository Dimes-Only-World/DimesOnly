import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { userId, plan, amountCents, referralCode } = await req.json();

    if (!userId || typeof userId !== "string") return json({ error: "Missing userId" }, 400);
    if (plan !== "monthly" && plan !== "annual") return json({ error: "Invalid plan" }, 400);
    const cents = Number(amountCents);
    if (!Number.isFinite(cents) || cents <= 0 || cents > 100000) return json({ error: "Invalid amount" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userRow } = await supabase.from("users").select("id").eq("id", userId).maybeSingle();
    if (!userRow) return json({ error: "User not found" }, 404);

    const { data: existing } = await supabase
      .from("flix_subscriptions")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (existing) return json({ data: { alreadyActive: true } });

    const periodEnd = new Date();
    if (plan === "annual") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    else periodEnd.setMonth(periodEnd.getMonth() + 1);

    const { data, error } = await supabase
      .from("flix_subscriptions")
      .insert({
        user_id: userId,
        plan,
        status: "active",
        amount_cents: cents,
        referral_code: typeof referralCode === "string" && referralCode ? referralCode.toLowerCase() : null,
        is_demo: true,
        current_period_end: periodEnd.toISOString(),
      })
      .select("id")
      .single();

    if (error) return json({ error: error.message }, 400);
    return json({ data });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
