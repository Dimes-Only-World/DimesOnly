import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { action, adminUserId, ...params } = body;

    if (!adminUserId) {
      return json({ error: "Admin user ID required" }, 401);
    }
    const { data: isAdmin, error: roleErr } = await admin.rpc("check_admin_by_user_id", { _user_id: adminUserId });
    if (roleErr || !isAdmin) return json({ error: "Admin access required" }, 403);

    switch (action) {
      case "listVehicles": {
        const { data, error } = await admin.from("vehicles").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        return json({ data });
      }
      case "createVehicle": {
        const { payload } = params;
        const { data, error } = await admin.from("vehicles").insert({ ...payload, created_by: adminUserId }).select().single();
        if (error) throw error;
        return json({ data });
      }
      case "updateVehicle": {
        const { id, payload } = params;
        const { data, error } = await admin.from("vehicles").update(payload).eq("id", id).select().single();
        if (error) throw error;
        return json({ data });
      }
      case "deleteVehicle": {
        const { id } = params;
        const { data: media } = await admin.from("vehicle_media").select("storage_path").eq("vehicle_id", id);
        if (media?.length) await admin.storage.from("vehicle-media").remove(media.map((m: any) => m.storage_path));
        const { error } = await admin.from("vehicles").delete().eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }
      case "listMedia": {
        const { vehicleId } = params;
        const { data, error } = await admin.from("vehicle_media").select("*").eq("vehicle_id", vehicleId).order("sort_order");
        if (error) throw error;
        const withUrls = await Promise.all((data || []).map(async (m: any) => {
          const { data: s } = await admin.storage.from("vehicle-media").createSignedUrl(m.storage_path, 60 * 60);
          return { ...m, url: s?.signedUrl };
        }));
        return json({ data: withUrls });
      }
      case "uploadMedia": {
        const { vehicleId, mediaType, fileName, contentType, base64, sortOrder } = params;
        const ext = (fileName?.split(".").pop() || "bin").toLowerCase();
        const path = `${vehicleId}/${crypto.randomUUID()}.${ext}`;
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const { error: upErr } = await admin.storage.from("vehicle-media").upload(path, bytes, { contentType });
        if (upErr) throw upErr;
        const { data, error } = await admin.from("vehicle_media").insert({
          vehicle_id: vehicleId, media_type: mediaType, url: path, storage_path: path, sort_order: sortOrder ?? 0,
        }).select().single();
        if (error) throw error;
        return json({ data });
      }
      case "deleteMedia": {
        const { id, storagePath } = params;
        if (storagePath) await admin.storage.from("vehicle-media").remove([storagePath]);
        const { error } = await admin.from("vehicle_media").delete().eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }
      case "listBookings": {
        const { data, error } = await admin.from("rental_bookings")
          .select("*, vehicles(year,make,model)")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return json({ data });
      }
      case "updateBookingStatus": {
        const { id, status } = params;
        const { data: b, error: bErr } = await admin.from("rental_bookings").update({ status }).eq("id", id).select().single();
        if (bErr) throw bErr;
        if (status === "paid" && b) {
          const rows: any[] = [];
          const amt = Number(b.total_price) * 0.10;
          if (b.referrer_username) {
            const { data: u } = await admin.from("users").select("id").ilike("username", b.referrer_username).maybeSingle();
            if (u) rows.push({ booking_id: b.id, user_id: u.id, commission_type: "direct", amount: amt, status: "pending" });
          }
          if (b.upline_referrer_username) {
            const { data: u } = await admin.from("users").select("id").ilike("username", b.upline_referrer_username).maybeSingle();
            if (u) rows.push({ booking_id: b.id, user_id: u.id, commission_type: "upline", amount: amt, status: "pending" });
          }
          if (rows.length) await admin.from("rental_commissions").insert(rows);
        }
        return json({ data: b });
      }
      case "listCommissions": {
        const { data, error } = await admin.from("rental_commissions").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        return json({ data });
      }
      case "updateCommissionStatus": {
        const { id, status } = params;
        const { error } = await admin.from("rental_commissions").update({ status }).eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }
      case "signBookingDoc": {
        const { path } = params;
        const { data, error } = await admin.storage.from("rental-documents").createSignedUrl(path, 300);
        if (error) throw error;
        return json({ url: data.signedUrl });
      }

      // ============ Promo Codes ============
      case "listPromoCodes": {
        const { data, error } = await admin.from("promo_codes").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        return json({ data });
      }
      case "upsertPromoCode": {
        const { payload } = params;
        const row = { ...payload };
        delete row.created_at; delete row.updated_at; delete row.uses_count;
        if (!row.id) delete row.id;
        row.code = String(row.code || "").trim().toUpperCase();
        if (!row.code) return json({ error: "Code is required" }, 400);
        row.discount_value = Number(row.discount_value) || 0;
        row.max_uses = row.max_uses ? Number(row.max_uses) : null;
        row.expires_at = row.expires_at || null;
        row.updated_at = new Date().toISOString();
        const { data, error } = await admin.from("promo_codes").upsert(row, { onConflict: "id" }).select().single();
        if (error) throw error;
        return json({ data });
      }
      case "deletePromoCode": {
        const { id } = params;
        const { error } = await admin.from("promo_codes").delete().eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }

      // ============ Themed Packages ============

      case "listPackages": {
        const { data, error } = await admin.from("themed_packages").select("*").order("price");
        if (error) throw error;
        return json({ data });
      }
      case "upsertPackage": {
        const { payload } = params;
        const row = { ...payload };
        delete row.created_at; delete row.updated_at;
        if (!row.id) delete row.id;
        const { data, error } = await admin.from("themed_packages").upsert(row).select().single();
        if (error) throw error;
        return json({ data });
      }
      case "deletePackage": {
        const { id } = params;
        const { error } = await admin.from("themed_packages").delete().eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }

      // ============ Captures ============
      case "listCaptures": {
        const { status } = params;
        let q = admin.from("rental_captures").select("*, vehicles(year,make,model)").order("created_at", { ascending: false });
        if (status) q = q.eq("moderation_status", status);
        const { data, error } = await q;
        if (error) throw error;
        const withUrls = await Promise.all((data || []).map(async (c: any) => {
          const { data: s } = await admin.storage.from("rental-captures").createSignedUrl(c.storage_path, 60 * 60);
          return { ...c, url: s?.signedUrl };
        }));
        return json({ data: withUrls });
      }
      case "moderateCapture": {
        const { id, status } = params;
        const { data, error } = await admin.from("rental_captures").update({ moderation_status: status }).eq("id", id).select().single();
        if (error) throw error;
        return json({ data });
      }
      case "toggleFeaturedCapture": {
        const { id, is_featured } = params;
        const { data, error } = await admin.from("rental_captures").update({ is_featured }).eq("id", id).select().single();
        if (error) throw error;
        return json({ data });
      }
      case "assignCaptureToContest": {
        const { id, contest_id } = params;
        const { data, error } = await admin.from("rental_captures").update({ contest_id: contest_id || null }).eq("id", id).select().single();
        if (error) throw error;
        return json({ data });
      }
      case "deleteCapture": {
        const { id, storagePath } = params;
        if (storagePath) await admin.storage.from("rental-captures").remove([storagePath]);
        const { error } = await admin.from("rental_captures").delete().eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }

      // ============ Contests ============
      case "listContests": {
        const { data, error } = await admin.from("capture_contests").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        return json({ data });
      }
      case "upsertContest": {
        const { payload } = params;
        const row = { ...payload };
        delete row.created_at; delete row.updated_at;
        if (!row.id) delete row.id;
        const { data, error } = await admin.from("capture_contests").upsert(row).select().single();
        if (error) throw error;
        return json({ data });
      }
      case "pickContestWinner": {
        const { id, winner_capture_id } = params;
        const { data, error } = await admin.from("capture_contests").update({ winner_capture_id, status: "ended" }).eq("id", id).select().single();
        if (error) throw error;
        return json({ data });
      }
      case "deleteContest": {
        const { id } = params;
        const { error } = await admin.from("capture_contests").delete().eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (e: any) {
    console.error("rental-admin error", e);
    return json({ error: e.message || String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
