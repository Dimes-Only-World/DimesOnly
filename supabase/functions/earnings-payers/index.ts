import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCallerId, AUTH_HEADERS } from "../_shared/caller.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": AUTH_HEADERS, "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type Payer = { name: string; username: string | null; avatar: string | null };

// Returns who paid for each of the caller's rental, clothing and FlameFlix earnings (public profile fields only).
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const me = await getCallerId(req);
    if (!me) return json({ error: "Please sign in." }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: meRow } = await admin.from("users").select("username").eq("id", me).maybeSingle();

    const [rc, cp, fe] = await Promise.all([
      admin.from("rental_commissions").select("id, booking_id").eq("user_id", me),
      admin.from("commission_payouts").select("id, payment_id").eq("user_id", me).in("commission_type", ["clothing_commission", "clothing_upline"]),
      meRow?.username ? admin.from("flix_earnings").select("id, source_subscriber_id").eq("earner_username", meRow.username) : Promise.resolve({ data: [] as any[] }),
    ]);

    const bookingIds = [...new Set((rc.data || []).map((r: any) => r.booking_id).filter(Boolean))];
    const orderIds = [...new Set((cp.data || []).map((r: any) => r.payment_id).filter(Boolean))];
    const [bk, od] = await Promise.all([
      bookingIds.length ? admin.from("rental_bookings").select("id, renter_user_id").in("id", bookingIds) : Promise.resolve({ data: [] as any[] }),
      orderIds.length ? admin.from("store_orders").select("id, user_id").in("id", orderIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const bookingUser: Record<string, string> = {};
    for (const b of bk.data || []) if (b.renter_user_id) bookingUser[b.id] = b.renter_user_id;
    const orderUser: Record<string, string> = {};
    for (const o of od.data || []) if (o.user_id) orderUser[o.id] = o.user_id;

    const userIds = new Set<string>([...Object.values(bookingUser), ...Object.values(orderUser)]);
    for (const f of fe.data || []) if (f.source_subscriber_id) userIds.add(f.source_subscriber_id);
    const users: Record<string, Payer> = {};
    if (userIds.size) {
      const { data: us } = await admin.from("users").select("id, username, profile_photo, front_page_photo").in("id", [...userIds]);
      for (const u of us || []) users[u.id] = { name: u.username || "Member", username: u.username || null, avatar: u.front_page_photo || u.profile_photo || null };
    }

    const out: Record<string, Record<string, Payer>> = { rentals: {}, clothing: {}, flix: {} };
    for (const r of rc.data || []) { const u = users[bookingUser[r.booking_id]]; if (u) out.rentals[r.id] = u; }
    for (const r of cp.data || []) { const u = users[orderUser[r.payment_id]]; if (u) out.clothing[r.id] = u; }
    for (const r of fe.data || []) { const u = users[r.source_subscriber_id]; if (u) out.flix[r.id] = u; }
    return json(out);
  } catch (e) {
    console.error("earnings-payers", e);
    return json({ error: "Could not load payer details." }, 500);
  }
});
