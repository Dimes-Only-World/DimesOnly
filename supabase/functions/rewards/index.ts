import { createClient } from "npm:@supabase/supabase-js@2";
import { getCallerId, getVerifiedAdminId, AUTH_HEADERS } from "../_shared/caller.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": AUTH_HEADERS, "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const CATEGORIES = ["most_tipped", "highest_rated", "car_sales", "money_circle", "dimes_recruited", "most_likes", "tips_given"] as const;
const AUDIENCES = ["dimes", "male", "normal_female", "business_owner"];
const WINNER_SHOW_DAYS = 5;

type Ev = { u: string; t: number; v: number };
type Db = ReturnType<typeof createClient>;

async function all(q: () => any): Promise<any[]> {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await q().range(from, from + 999);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const ts = (s: string | null) => (s ? new Date(s).getTime() : 0);
const PAID = new Set(["completed", "captured", "approved", "paid", "success", "succeeded"]);

async function events(db: Db, cat: string, start: string, end: string): Promise<{ evs: Ev[]; avg?: boolean }> {
  switch (cat) {
    case "most_tipped":
    case "tips_given": {
      const col = cat === "most_tipped" ? "tipped_user_id" : "tipper_user_id";
      const rows = await all(() => db.from("tips_transactions").select(`${col}, tip_amount, payment_status, created_at`).gte("created_at", start).lte("created_at", end).not(col, "is", null));
      return { evs: rows.filter((r) => PAID.has(String(r.payment_status || "").toLowerCase())).map((r) => ({ u: r[col], t: ts(r.created_at), v: Number(r.tip_amount) || 0 })) };
    }
    case "highest_rated": {
      const rows = await all(() => db.from("ratings").select("user_id, rating, created_at").gte("created_at", start).lte("created_at", end).not("user_id", "is", null));
      return { evs: rows.map((r) => ({ u: r.user_id, t: ts(r.created_at), v: Number(r.rating) || 0 })), avg: true };
    }
    case "car_sales": {
      const rows = await all(() => db.from("vehicle_purchase_applications").select("referrer_user_id, sold_at").eq("sale_status", "sold").gte("sold_at", start).lte("sold_at", end).not("referrer_user_id", "is", null));
      return { evs: rows.map((r) => ({ u: r.referrer_user_id, t: ts(r.sold_at), v: 1 })) };
    }
    case "money_circle":
    case "dimes_recruited": {
      const rows = await all(() => db.from("users").select("referred_by, user_type, created_at").gte("created_at", start).lte("created_at", end).not("referred_by", "is", null));
      const filtered = rows.filter((r) => cat === "money_circle" || ["exotic", "stripper"].includes(String(r.user_type || "").toLowerCase()));
      const names = [...new Set(filtered.map((r) => String(r.referred_by).trim().toLowerCase()).filter((n) => n && n !== "company"))];
      const map: Record<string, string> = {};
      for (let i = 0; i < names.length; i += 200) {
        const chunk = names.slice(i, i + 200);
        const { data } = await db.from("users").select("id, username").in("username", chunk);
        for (const u of data || []) map[String(u.username).toLowerCase()] = u.id;
        // case-insensitive fallback
        for (const n of chunk.filter((c) => !map[c])) {
          const { data: d } = await db.from("users").select("id").ilike("username", n).limit(1);
          if (d?.[0]) map[n] = d[0].id;
        }
      }
      return { evs: filtered.map((r) => ({ u: map[String(r.referred_by).trim().toLowerCase()], t: ts(r.created_at), v: 1 })).filter((e) => e.u) };
    }
    case "most_likes": {
      const [fl, ml, pl] = await Promise.all([
        all(() => db.from("feed_likes").select("created_at, feed_posts!inner(user_id)").gte("created_at", start).lte("created_at", end)),
        all(() => db.from("media_likes").select("created_at, user_media!inner(user_id)").gte("created_at", start).lte("created_at", end)),
        all(() => db.from("profile_likes").select("profile_user_id, created_at").gte("created_at", start).lte("created_at", end)),
      ]);
      return {
        evs: [
          ...fl.map((r: any) => ({ u: r.feed_posts?.user_id, t: ts(r.created_at), v: 1 })),
          ...ml.map((r: any) => ({ u: r.user_media?.user_id, t: ts(r.created_at), v: 1 })),
          ...pl.map((r: any) => ({ u: r.profile_user_id, t: ts(r.created_at), v: 1 })),
        ].filter((e) => e.u),
      };
    }
  }
  return { evs: [] };
}

function inAudience(u: any, aud: string[]): boolean {
  const type = String(u.user_type || "").toLowerCase();
  const gender = String(u.gender || "").toLowerCase();
  if (aud.includes("dimes") && ["exotic", "stripper"].includes(type)) return true;
  if (aud.includes("male") && (gender === "male" || type === "male")) return true;
  if (aud.includes("normal_female") && gender === "female" && !["exotic", "stripper"].includes(type)) return true;
  if (aud.includes("business_owner") && u.business_owner_elite_active) return true;
  return false;
}

async function standings(db: Db, c: any) {
  const endIso = new Date(c.ends_at ? Math.min(Date.now(), ts(c.ends_at)) : Date.now()).toISOString();
  const { evs, avg } = await events(db, c.category, c.starts_at, endIso);
  const ids = [...new Set(evs.map((e) => e.u))];
  const users: Record<string, any> = {};
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await db.from("users").select("id, username, profile_photo, front_page_photo, user_type, gender, business_owner_elite_active").in("id", ids.slice(i, i + 200));
    for (const u of data || []) users[u.id] = u;
  }
  const aud: string[] = c.audience?.length ? c.audience : AUDIENCES;
  const ok = evs.filter((e) => users[e.u] && inAudience(users[e.u], aud)).sort((a, b) => a.t - b.t);
  const score: Record<string, { sum: number; n: number }> = {};
  let goalHit: { u: string; t: number; v: number } | null = null;
  for (const e of ok) {
    const s = (score[e.u] ||= { sum: 0, n: 0 });
    s.sum += e.v; s.n += 1;
    if (!goalHit && c.contest_type === "goal" && c.goal && !avg && s.sum >= c.goal) goalHit = { u: e.u, t: e.t, v: s.sum };
  }
  const ranked = Object.entries(score)
    .map(([id, s]) => ({ user_id: id, score: avg ? Math.round((s.sum / s.n) * 10) / 10 : Math.round(s.sum * 100) / 100, count: s.n }))
    .sort((a, b) => b.score - a.score || b.count - a.count)
    .map((r, i) => ({ ...r, rank: i + 1, username: users[r.user_id]?.username, avatar: users[r.user_id]?.front_page_photo || users[r.user_id]?.profile_photo || null }));
  return { ranked, goalHit, users };
}

async function settle(db: Db, c: any, st: Awaited<ReturnType<typeof standings>>) {
  if (c.status !== "active") return c;
  let patch: any = null;
  if (st.goalHit) patch = { status: "won", winner_user_id: st.goalHit.u, winner_score: st.goalHit.v, won_at: new Date(st.goalHit.t).toISOString() };
  else if (c.ends_at && Date.now() > ts(c.ends_at)) {
    const top = st.ranked[0];
    patch = top ? { status: "won", winner_user_id: top.user_id, winner_score: top.score, won_at: c.ends_at } : { status: "expired" };
  }
  if (!patch) return c;
  const { data } = await db.from("reward_contests").update(patch).eq("id", c.id).eq("status", "active").select().maybeSingle();
  return data || { ...c, ...patch };
}

async function decorate(db: Db, c: any, me: string | null) {
  const st = await standings(db, c);
  const cc = await settle(db, c, st);
  const mine = me ? st.ranked.find((r) => r.user_id === me) : null;
  let winner = null;
  if (cc.winner_user_id) {
    const w = st.users[cc.winner_user_id] || (await db.from("users").select("username, profile_photo, front_page_photo").eq("id", cc.winner_user_id).maybeSingle()).data;
    winner = { user_id: cc.winner_user_id, username: w?.username, avatar: w?.front_page_photo || w?.profile_photo || null, score: cc.winner_score };
  }
  let featuredUser = null;
  if (cc.featured_user_id) {
    const f = st.users[cc.featured_user_id] || (await db.from("users").select("id, username, profile_photo, front_page_photo").eq("id", cc.featured_user_id).maybeSingle()).data;
    if (f) featuredUser = { user_id: f.id || cc.featured_user_id, username: f.username, avatar: f.front_page_photo || f.profile_photo || null };
  }
  return { ...cc, leaders: st.ranked.slice(0, 5), participants: st.ranked.length, my: mine || null, winner, featured_user: featuredUser };
}

function clean(p: any) {
  const title = String(p.title || "").trim().slice(0, 120);
  if (!title) throw new Error("Title is required");
  if (!CATEGORIES.includes(p.category)) throw new Error("Invalid category");
  const type = p.contest_type === "goal" ? "goal" : "most";
  const goal = type === "goal" ? Math.floor(Number(p.goal)) : null;
  if (type === "goal" && (!goal || goal < 1)) throw new Error("Goal must be at least 1");
  if (type === "goal" && p.category === "highest_rated") throw new Error("Highest rated can't be a goal contest");
  const starts = new Date(p.starts_at);
  const ends = p.ends_at ? new Date(p.ends_at) : null;
  if (isNaN(starts.getTime())) throw new Error("Start date is required");
  if (type === "most" && !ends) throw new Error("Expiration is required for this contest type");
  if (ends && (isNaN(ends.getTime()) || ends <= starts)) throw new Error("Expiration must be after the start date");
  const audience = (Array.isArray(p.audience) ? p.audience : []).filter((a: string) => AUDIENCES.includes(a));
  if (!audience.length) throw new Error("Pick at least one group who can enter");
  const prize = Number(p.prize_amount);
  if (!(prize >= 0) || prize > 1_000_000) throw new Error("Invalid prize amount");
  return {
    title, description: String(p.description || "").slice(0, 500) || null, prize_amount: prize,
    prize_label: String(p.prize_label || "").slice(0, 80) || null, category: p.category, contest_type: type, goal, audience,
    starts_at: starts.toISOString(), ends_at: ends?.toISOString() || null,
    background_image_url: String(p.background_image_url || "").slice(0, 1000) || null,
    featured_user_id: p.featured_user_id || null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    if (action === "list" || action === "myBonuses") {
      const me = await getCallerId(req);
      if (action === "myBonuses" && !me) return json({ error: "Please sign in." }, 401);
      const since = new Date(Date.now() - WINNER_SHOW_DAYS * 864e5).toISOString();
      const { data, error } = await db.from("reward_contests").select("*")
        .or(`status.eq.active,and(status.eq.won,won_at.gte.${since})`).lte("starts_at", new Date().toISOString()).order("ends_at");
      if (error) throw error;
      const contests = await Promise.all((data || []).map((c) => decorate(db, c, me)));
      if (action === "list") return json({ contests: contests.filter((c) => c.status === "active" || c.status === "won") });
      const { data: won } = await db.from("reward_contests").select("id, title, prize_amount, prize_label, won_at, paid_at, category").eq("winner_user_id", me).order("won_at", { ascending: false });
      const paidTotal = (won || []).filter((w) => w.paid_at).reduce((s, w) => s + Number(w.prize_amount || 0), 0);
      const pendingTotal = (won || []).filter((w) => !w.paid_at).reduce((s, w) => s + Number(w.prize_amount || 0), 0);
      const standing = contests.filter((c) => c.status === "active" && c.my).map((c) => ({ id: c.id, title: c.title, prize_amount: c.prize_amount, prize_label: c.prize_label, rank: c.my.rank, score: c.my.score, participants: c.participants, category: c.category, ends_at: c.ends_at }));
      return json({ won: won || [], paidTotal, pendingTotal, standing });
    }

    const adminId = await getVerifiedAdminId(req);
    if (!adminId) return json({ error: "Admin session expired. Please sign in again." }, 401);

    switch (action) {
      case "searchUsers": {
        const term = String(body.term || "").trim();
        if (term.length < 2) return json({ users: [] });
        const { data, error } = await db.from("users").select("id, username, profile_photo, front_page_photo").ilike("username", `%${term.replace(/[%_]/g, "")}%`).limit(8);
        if (error) throw error;
        return json({ users: (data || []).map((u) => ({ id: u.id, username: u.username, avatar: u.front_page_photo || u.profile_photo || null })) });
      }
      case "adminList": {
        const { data, error } = await db.from("reward_contests").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        const out = await Promise.all((data || []).map((c) => decorate(db, c, null)));
        return json({ contests: out });
      }
      case "create": {
        const row = clean(body.payload || {});
        const { data, error } = await db.from("reward_contests").insert({ ...row, created_by: adminId }).select().single();
        if (error) throw error;
        return json({ contest: data });
      }
      case "update": {
        const row = clean(body.payload || {});
        const { data, error } = await db.from("reward_contests").update(row).eq("id", body.id).select().single();
        if (error) throw error;
        return json({ contest: data });
      }
      case "setStatus": {
        const status = String(body.status);
        if (!["active", "paused", "ended"].includes(status)) return json({ error: "Invalid status" }, 400);
        const patch: any = { status };
        if (status === "ended") {
          const { data: c } = await db.from("reward_contests").select("*").eq("id", body.id).single();
          const st = await standings(db, c);
          const top = st.ranked[0];
          if (top) Object.assign(patch, { status: "won", winner_user_id: top.user_id, winner_score: top.score, won_at: new Date().toISOString() });
          else patch.status = "expired";
        }
        const { error } = await db.from("reward_contests").update(patch).eq("id", body.id);
        if (error) throw error;
        return json({ ok: true });
      }
      case "markPaid": {
        const { error } = await db.from("reward_contests").update({ paid_at: body.paid ? new Date().toISOString() : null }).eq("id", body.id).not("winner_user_id", "is", null);
        if (error) throw error;
        return json({ ok: true });
      }
      case "delete": {
        const { error } = await db.from("reward_contests").delete().eq("id", body.id);
        if (error) throw error;
        return json({ ok: true });
      }
    }
    return json({ error: "Invalid request" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("rewards", msg);
    return json({ error: /required|Invalid|must|Pick|can't/.test(msg) ? msg : "Could not load rewards." }, /required|Invalid|must|Pick|can't/.test(msg) ? 400 : 500);
  }
});
