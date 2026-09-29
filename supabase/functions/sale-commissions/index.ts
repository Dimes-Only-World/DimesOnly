import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCallerId, AUTH_HEADERS } from "../_shared/caller.ts";
import { areaCode, signAvatar, DIRECT_RATE, UPLINE_RATE } from "../_shared/saleCommission.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": AUTH_HEADERS, "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Returns the signed-in member's vehicle sale commissions (direct 53% and second-level 5%) and bonuses.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const me = await getCallerId(req);
    if (!me) return json({ error: "Please sign in." }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: apps, error } = await admin.from("vehicle_purchase_applications")
      .select("id, applicant, submitted_at, sale_status, sold_at, referrer_user_id, upline_user_id, referrer_commission, upline_commission, buyer_avatar_path, user_id")
      .or(`referrer_user_id.eq.${me},upline_user_id.eq.${me}`)
      .order("submitted_at", { ascending: false });
    if (error) throw error;

    const ids = new Set<string>();
    for (const a of apps || []) { if (a.referrer_user_id) ids.add(a.referrer_user_id); if (a.user_id) ids.add(a.user_id); }
    const users: Record<string, any> = {};
    if (ids.size) {
      const { data: us } = await admin.from("users").select("id, username, profile_photo, front_page_photo").in("id", [...ids]);
      for (const u of us || []) users[u.id] = { username: u.username, avatar: u.front_page_photo || u.profile_photo || null };
    }

    const rows = await Promise.all((apps || []).map(async (a: any) => {
      const direct = a.referrer_user_id === me;
      return {
        id: a.id,
        level: direct ? "direct" : "upline",
        rate: direct ? DIRECT_RATE : UPLINE_RATE,
        submitted_at: a.submitted_at,
        area_code: areaCode(a.applicant?.cellPhone),
        // Privacy: members see only a Dimes Only username, otherwise first name only.
        buyer_first: (a.user_id && users[a.user_id]?.username) ? `@${users[a.user_id].username}` : (a.applicant?.firstName || "Buyer"),
        buyer_last: "",
        buyer_avatar: (await signAvatar(admin, a.buyer_avatar_path)) || (a.user_id ? users[a.user_id]?.avatar : null) || null,
        status: a.sale_status,
        sold_at: a.sold_at,
        amount: a.sale_status === "sold" ? Number(direct ? a.referrer_commission : a.upline_commission) || 0 : 0,
        via: direct ? null : users[a.referrer_user_id] || null,
        buyer_username: a.user_id ? users[a.user_id]?.username || null : null,
      };
    }));

    const { data: bonuses } = await admin.from("sale_commission_bonuses").select("month, amount, note").eq("user_id", me).order("month", { ascending: false });
    const soldTotal = rows.reduce((s, r) => s + r.amount, 0);
    const bonusTotal = (bonuses || []).reduce((s: number, b: any) => s + Number(b.amount || 0), 0);
    return json({ rows, bonuses: bonuses || [], soldTotal, bonusTotal, total: soldTotal + bonusTotal });
  } catch (e) {
    console.error("sale-commissions", e);
    return json({ error: "Could not load vehicle sale commissions." }, 500);
  }
});
