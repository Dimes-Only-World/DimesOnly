import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { action, adminUserId, ...params } = await req.json();
    if (!adminUserId) return json({ error: "Admin user ID required" }, 401);

    const { data: isAdmin, error: roleError } = await supabase
      .rpc("check_admin_by_user_id", { _user_id: adminUserId });
    if (roleError || !isAdmin) return json({ error: "Admin access required" }, 403);

    switch (action) {
      case "overview": {
        const [{ data: subs }, { data: earnings }, { data: pendingPayouts }, { data: titles }] = await Promise.all([
          supabase.from("flix_subscriptions").select("id,plan,status,amount_cents,created_at"),
          supabase.from("flix_earnings").select("amount_cents,level,status"),
          supabase.from("flix_payout_requests").select("id").eq("status", "pending"),
          supabase.from("flix_titles").select("id,status"),
        ]);
        const activeSubs = (subs || []).filter((s) => s.status === "active");
        return json({
          subscribers: activeSubs.length,
          monthly: activeSubs.filter((s) => s.plan === "monthly").length,
          annual: activeSubs.filter((s) => s.plan === "annual").length,
          mrr_cents: activeSubs.reduce((a, s) => a + (s.plan === "monthly" ? s.amount_cents : Math.round(s.amount_cents / 12)), 0),
          earnings_total_cents: (earnings || []).reduce((a, e) => a + e.amount_cents, 0),
          pending_payouts: (pendingPayouts || []).length,
          live_titles: (titles || []).filter((t) => t.status === "live").length,
          draft_titles: (titles || []).filter((t) => t.status !== "live").length,
        });
      }

      case "listTitles": {
        const { data, error } = await supabase.from("flix_titles").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        return json({ titles: data });
      }

      case "saveTitle": {
        const t = params.title;
        const row = {
          name: t.name,
          logline: t.logline || "",
          description: t.description || "",
          genres: t.genres || [],
          rating: t.rating || "TV-MA",
          year: t.year || new Date().getFullYear(),
          duration_minutes: t.duration_minutes || 60,
          cast_members: t.cast_members || [],
          tags: t.tags || [],
          poster_url: t.poster_url || "",
          backdrop_url: t.backdrop_url || "",
          poster_mobile_url: t.poster_mobile_url || "",
          backdrop_mobile_url: t.backdrop_mobile_url || "",
          trailer_url: t.trailer_url || "",
          video_url: t.video_url || "",
          featured: !!t.featured,
          featured_order: t.featured_order || 0,
          is_original: !!t.is_original,
          coming_soon: !!t.coming_soon,
          status: t.status || "draft",
        };
        if (t.id) {
          const { error } = await supabase.from("flix_titles").update(row).eq("id", t.id);
          if (error) throw error;
          return json({ title_id: t.id });
        }
        const { data, error } = await supabase.from("flix_titles").insert(row).select("id").single();
        if (error) throw error;
        return json({ title_id: data.id });
      }

      case "setTitleStatus": {
        const { error } = await supabase.from("flix_titles").update({ status: params.status }).eq("id", params.title_id);
        if (error) throw error;
        return json({ ok: true });
      }

      case "deleteTitle": {
        const { error } = await supabase.from("flix_titles").delete().eq("id", params.title_id);
        if (error) throw error;
        return json({ ok: true });
      }

      case "listSubscriptions": {
        const { data, error } = await supabase
          .from("flix_subscriptions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(300);
        if (error) throw error;
        const userIds = [...new Set((data || []).map((s) => s.user_id))];
        let usernames: Record<string, string> = {};
        if (userIds.length) {
          const { data: users } = await supabase.from("users").select("id,username").in("id", userIds);
          for (const u of users || []) usernames[u.id] = u.username;
        }
        return json({ subscriptions: (data || []).map((s) => ({ ...s, username: usernames[s.user_id] || "—" })) });
      }

      case "listEarnings": {
        const { data, error } = await supabase
          .from("flix_earnings")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(300);
        if (error) throw error;
        const userIds = [...new Set((data || []).flatMap((e) => [e.user_id, e.subscriber_id]))];
        let usernames: Record<string, string> = {};
        if (userIds.length) {
          const { data: users } = await supabase.from("users").select("id,username").in("id", userIds);
          for (const u of users || []) usernames[u.id] = u.username;
        }
        return json({
          earnings: (data || []).map((e) => ({
            ...e,
            earner: usernames[e.user_id] || "—",
            subscriber: usernames[e.subscriber_id] || "—",
          })),
        });
      }

      case "listPayouts": {
        const { data, error } = await supabase
          .from("flix_payout_requests")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(300);
        if (error) throw error;
        const userIds = [...new Set((data || []).map((p) => p.user_id))];
        let usernames: Record<string, string> = {};
        if (userIds.length) {
          const { data: users } = await supabase.from("users").select("id,username").in("id", userIds);
          for (const u of users || []) usernames[u.id] = u.username;
        }
        return json({ payouts: (data || []).map((p) => ({ ...p, username: usernames[p.user_id] || "—" })) });
      }

      case "updatePayout": {
        if (!["pending", "paid", "declined"].includes(params.status)) return json({ error: "Invalid status" }, 400);
        const { error } = await supabase
          .from("flix_payout_requests")
          .update({ status: params.status, processed_at: new Date().toISOString(), admin_id: adminUserId })
          .eq("id", params.payout_id);
        if (error) throw error;
        return json({ ok: true });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (e) {
    console.error("flix-admin error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
