import { getVerifiedAdminId, AUTH_HEADERS } from "../_shared/caller.ts";
import { resolveReferralChain, computeCommissions, areaCode, signAvatar } from "../_shared/saleCommission.ts";
import { decryptSsn } from "../_shared/ssnCrypto.ts";
import { buildManualPaymentReceiptPdf } from "./receipt.ts";
import { sendEmailWithAttachment } from "../_shared/dimes-emails.ts";
import { summarizePayments, validPaymentDate, validPaymentMethod, type PaymentHistoryRow } from "./paymentHistory.ts";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": AUTH_HEADERS, "Access-Control-Allow-Methods": "POST, OPTIONS" };
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { action, adminUserId, ...params } = body;
    { const _vid = await getVerifiedAdminId(req); if (!_vid || _vid !== adminUserId) return json({ error: "Admin session expired. Please sign in again." }, 401); }


    if (!adminUserId) {
      return json({ error: "Admin user ID required" }, 401);
    }
    const { data: isAdmin, error: roleErr } = await admin.rpc("check_admin_by_user_id", { _user_id: adminUserId });
    if (roleErr || !isAdmin) return json({ error: "Admin access required" }, 403);

    switch (action) {
      case "listVehicles": {
        const { data, error } = await admin.from("vehicles").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        const { data: costs } = await admin.from("vehicle_costs").select("vehicle_id, monthly_payment");
        const costMap = new Map((costs || []).map((c: any) => [c.vehicle_id, Number(c.monthly_payment)]));
        return json({ data: (data || []).map((v: any) => ({ ...v, our_monthly_payment: costMap.get(v.id) ?? null })) });
      }
      case "createVehicle":
      case "updateVehicle": {
        const { id, payload: raw } = params;
        const { our_monthly_payment, ...payload } = raw || {};
        const q = action === "createVehicle"
          ? admin.from("vehicles").insert({ ...payload, created_by: adminUserId })
          : admin.from("vehicles").update(payload).eq("id", id);
        const { data, error } = await q.select().single();
        if (error) throw error;
        const pay = Number(our_monthly_payment);
        if (our_monthly_payment !== undefined && our_monthly_payment !== null && our_monthly_payment !== "" && Number.isFinite(pay) && pay >= 0) {
          const { error: cErr } = await admin.from("vehicle_costs").upsert({ vehicle_id: data.id, monthly_payment: pay, updated_at: new Date().toISOString() });
          if (cErr) throw cErr;
        }
        return json({ data: { ...data, our_monthly_payment: Number.isFinite(pay) ? pay : null } });
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
        const paths = (data || []).map((m: any) => m.storage_path);
        const urlByPath = new Map<string, string>();
        if (paths.length) {
          const { data: signedList } = await admin.storage.from("vehicle-media").createSignedUrls(paths, 60 * 60);
          for (const s of signedList || []) if (s?.path && s?.signedUrl) urlByPath.set(s.path, s.signedUrl);
        }
        return json({ data: (data || []).map((m: any) => ({ ...m, url: urlByPath.get(m.storage_path) || null })) });
      }
      case "uploadMedia": {
        const { vehicleId, mediaType, fileName, contentType, base64, sortOrder } = params;
        const ext = (fileName?.split(".").pop() || "bin").toLowerCase();
        const okTypes = ["image/jpeg","image/png","image/webp","image/gif","video/mp4","video/quicktime","video/webm"];
        if (!okTypes.includes(String(contentType)) || !["photo","video"].includes(mediaType)) return json({ error: "Unsupported file type" }, 400);
        if (!/^[a-z0-9]{1,5}$/.test(ext) || typeof base64 !== "string" || base64.length > 140 * 1024 * 1024) return json({ error: "File too large or invalid" }, 400);
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
      case "setCoverMedia": {
        const { id, vehicleId } = params;
        const { data: photos, error } = await admin.from("vehicle_media").select("id")
          .eq("vehicle_id", vehicleId).eq("media_type", "photo").order("sort_order").order("created_at");
        if (error) throw error;
        if (!(photos || []).some((p: any) => p.id === id)) return json({ error: "Photo not found" }, 404);
        const ordered = [id, ...(photos || []).map((p: any) => p.id).filter((x: string) => x !== id)];
        for (let i = 0; i < ordered.length; i++) {
          const { error: uErr } = await admin.from("vehicle_media").update({ sort_order: i }).eq("id", ordered[i]);
          if (uErr) throw uErr;
        }
        return json({ ok: true });
      }
      case "deleteMedia": {
        const { id, storagePath } = params;
        if (storagePath) await admin.storage.from("vehicle-media").remove([storagePath]);
        const { error } = await admin.from("vehicle_media").delete().eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }
      case "setTestFlag": {
        const table = params.kind === "booking" ? "rental_bookings" : params.kind === "application" ? "vehicle_purchase_applications" : params.kind === "user" ? "users" : null;
        if (!table || typeof params.id !== "string") return json({ error: "Invalid request" }, 400);
        const { error } = await admin.from(table).update({ is_test: !!params.value }).eq("id", params.id);
        if (error) throw error;
        return json({ ok: true });
      }
      case "listBookings": {
        const { data, error } = await admin.from("rental_bookings")
          .select("*, vehicles(year,make,model,day_rate,three_day_rate,weekly_rate,monthly_rate,down_payment,security_deposit,hour_rate), booking_addons(name_snapshot, price_snapshot)")
          .order("created_at", { ascending: false });
        if (error) throw error;

        const renterIds = [...new Set((data || []).map((b: any) => b.renter_user_id).filter(Boolean))];
        const contactById = new Map<string, any>();
        if (renterIds.length) {
          const { data: users } = await admin
            .from("users")
            .select("id, username, email, phone_number")
            .in("id", renterIds);
          for (const u of users || []) contactById.set(u.id, u);
        }

        const rows = (data || []).map((b: any) => {
          const u = contactById.get(b.renter_user_id);
          return {
            ...b,
            renter_username: u?.username || null,
            renter_email: b.contact_email || u?.email || null,
            renter_phone: b.contact_phone || u?.phone_number || null,
          };
        });
        return json({ data: rows });
      }
      case "listPaymentHistory": {
        const method = params.method === "all" || params.method == null ? null : params.method;
        const dateFrom = params.dateFrom || null;
        const dateTo = params.dateTo || null;
        if (method && !validPaymentMethod(method)) return json({ error: "Invalid payment method" }, 400);
        if (dateFrom && !validPaymentDate(dateFrom)) return json({ error: "Invalid start date" }, 400);
        if (dateTo && !validPaymentDate(dateTo)) return json({ error: "Invalid end date" }, 400);
        if (dateFrom && dateTo && dateFrom > dateTo) return json({ error: "Start date must be before end date" }, 400);

        let bookingQuery = admin.from("rental_bookings")
          .select("id, renter_user_id, total_price, amount_received, paid_at, payment_method, payment_reference, payment_receipt_path, status, vehicles(year,make,model)")
          .not("paid_at", "is", null)
          .in("status", ["paid", "active", "completed", "returned"]);
        let extensionQuery = admin.from("rental_extensions")
          .select("id, booking_id, renter_user_id, paid_at, total_charged, paypal_capture_id, status, rental_bookings!inner(vehicles(year,make,model))")
          .eq("status", "paid").not("paid_at", "is", null);
        if (dateFrom) { bookingQuery = bookingQuery.gte("paid_at", `${dateFrom}T00:00:00.000Z`); extensionQuery = extensionQuery.gte("paid_at", `${dateFrom}T00:00:00.000Z`); }
        if (dateTo) {
          const exclusiveEnd = new Date(new Date(`${dateTo}T00:00:00.000Z`).getTime() + 86_400_000).toISOString();
          bookingQuery = bookingQuery.lt("paid_at", exclusiveEnd);
          extensionQuery = extensionQuery.lt("paid_at", exclusiveEnd);
        }
        if (method === "cash" || method === "cashapp") bookingQuery = bookingQuery.eq("payment_method", method);
        if (method === "paypal") bookingQuery = bookingQuery.or("payment_method.eq.paypal,payment_method.is.null");

        const [{ data: bookings, error: bookingError }, extensionResult] = await Promise.all([
          bookingQuery.order("paid_at", { ascending: false }),
          method && method !== "paypal" ? Promise.resolve({ data: [], error: null }) : extensionQuery.order("paid_at", { ascending: false }),
        ]);
        if (bookingError) throw bookingError;
        if (extensionResult.error) throw extensionResult.error;
        const renterIds = [...new Set([...(bookings || []), ...(extensionResult.data || [])].map((row: any) => row.renter_user_id).filter(Boolean))];
        const usernames = new Map<string, string>();
        if (renterIds.length) {
          const { data: users, error: usersError } = await admin.from("users").select("id,username").in("id", renterIds);
          if (usersError) throw usersError;
          for (const user of users || []) usernames.set(user.id, user.username);
        }
        const vehicleLabel = (source: any) => {
          const vehicle = Array.isArray(source) ? source[0] : source;
          return [vehicle?.year, vehicle?.make, vehicle?.model].filter(Boolean).join(" ");
        };
        const rows: PaymentHistoryRow[] = [
          ...(bookings || []).map((row: any) => ({
            id: row.id, booking_id: row.id, payment_type: "booking" as const, paid_at: row.paid_at,
            payment_method: row.payment_method === "cash" || row.payment_method === "cashapp" ? row.payment_method : "paypal",
            amount: Number(row.payment_method === "cash" || row.payment_method === "cashapp" ? row.amount_received ?? row.total_price : row.total_price),
            payment_reference: row.payment_reference || null, receipt_path: row.payment_receipt_path || null,
            renter_username: usernames.get(row.renter_user_id) || null, vehicle_label: vehicleLabel(row.vehicles),
          })),
          ...(extensionResult.data || []).map((row: any) => ({
            id: row.id, booking_id: row.booking_id, payment_type: "extension" as const, paid_at: row.paid_at,
            payment_method: "paypal" as const, amount: Number(row.total_charged), payment_reference: row.paypal_capture_id || null,
            receipt_path: null, renter_username: usernames.get(row.renter_user_id) || null,
            vehicle_label: vehicleLabel(Array.isArray(row.rental_bookings) ? row.rental_bookings[0]?.vehicles : row.rental_bookings?.vehicles),
          })),
        ].sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime());
        return json({ data: rows, totals: summarizePayments(rows) });
      }
      case "updateBookingStatus": {
        const { id, status } = params;
        const { data: b, error: bErr } = await admin.from("rental_bookings").update({ status }).eq("id", id).select().single();
        if (bErr) throw bErr;
        if (status === "paid" && b) await createCommissions(admin, b);
        if (["paid", "active"].includes(status) && b?.vehicle_id) {
          await admin.from("vehicles").update({ availability_status: "rented" }).eq("id", b.vehicle_id);
        }
        if (["cancelled", "completed", "rejected"].includes(status) && b?.vehicle_id) {
          await admin.from("vehicles").update({ availability_status: "available" }).eq("id", b.vehicle_id);
        }
        return json({ data: b });
      }
      case "listHolds": {
        const { data: setting } = await admin.from("app_settings").select("value").eq("key", "rental_hold_deposit").maybeSingle();
        const { data, error } = await admin.from("rental_holds").select("*, vehicles(year, make, model)").order("created_at", { ascending: false }).limit(300);
        if (error) throw error;
        const ids = [...new Set((data || []).map((h: any) => h.user_id))];
        const { data: users } = ids.length ? await admin.from("users").select("id, username").in("id", ids) : { data: [] };
        const names = new Map((users || []).map((u: any) => [u.id, u.username]));
        return json({ data: (data || []).map((h: any) => ({ ...h, username: names.get(h.user_id) || null })), depositAmount: Number((setting?.value as any)?.value ?? 150) });
      }
      case "listPurchaseBackgrounds": {
        const { data: bg } = await admin.from("app_settings").select("value").eq("key", "purchase_backgrounds").maybeSingle();
        const paths: string[] = Array.isArray((bg?.value as any)?.paths) ? (bg!.value as any).paths : [];
        const { data: signed } = paths.length ? await admin.storage.from("vehicle-media").createSignedUrls(paths, 3600) : { data: [] };
        const map = new Map((signed || []).map((x: any) => [x.path, x.signedUrl]));
        return json({ data: paths.map((p) => ({ path: p, url: map.get(p) || null })) });
      }
      case "addPurchaseBackground": {
        const { fileName, contentType, base64 } = params;
        const ext = (fileName?.split(".").pop() || "jpg").toLowerCase();
        if (!["image/jpeg", "image/png", "image/webp"].includes(String(contentType)) || !/^[a-z0-9]{1,5}$/.test(ext)) return json({ error: "Use a JPG, PNG or WEBP photo" }, 400);
        if (typeof base64 !== "string" || base64.length > 20 * 1024 * 1024) return json({ error: "Photo too large" }, 400);
        const path = `purchase-backgrounds/${crypto.randomUUID()}.${ext}`;
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const { error: upErr } = await admin.storage.from("vehicle-media").upload(path, bytes, { contentType });
        if (upErr) throw upErr;
        const { data: bg } = await admin.from("app_settings").select("value").eq("key", "purchase_backgrounds").maybeSingle();
        const paths: string[] = Array.isArray((bg?.value as any)?.paths) ? (bg!.value as any).paths : [];
        const { error } = await admin.from("app_settings").upsert({ key: "purchase_backgrounds", value: { paths: [...paths, path] } });
        if (error) throw error;
        return json({ data: { path } });
      }
      case "setPurchaseBackgrounds": {
        const { data: bg } = await admin.from("app_settings").select("value").eq("key", "purchase_backgrounds").maybeSingle();
        const current: string[] = Array.isArray((bg?.value as any)?.paths) ? (bg!.value as any).paths : [];
        const next: string[] = Array.isArray(params.paths) ? params.paths.filter((p: unknown) => typeof p === "string" && current.includes(p as string)) : [];
        const removed = current.filter((p) => !next.includes(p));
        if (removed.length) await admin.storage.from("vehicle-media").remove(removed);
        const { error } = await admin.from("app_settings").upsert({ key: "purchase_backgrounds", value: { paths: next } });
        if (error) throw error;
        return json({ data: { paths: next } });
      }
      case "listRentalUpdates": {
        const { data: s } = await admin.from("app_settings").select("value").eq("key", "rental_updates").maybeSingle();
        if (!s) return json({ data: null });
        const items: any[] = Array.isArray((s.value as any)?.items) ? (s.value as any).items : [];
        const paths = items.map((x) => x.path).filter(Boolean);
        const { data: signed } = paths.length ? await admin.storage.from("vehicle-media").createSignedUrls(paths, 3600) : { data: [] };
        const map = new Map((signed || []).map((x: any) => [x.path, x.signedUrl]));
        return json({ data: items.map((x) => ({ ...x, url: x.path ? map.get(x.path) || null : x.image_url || null })) });
      }
      case "uploadRentalUpdateImage": {
        const { fileName, contentType, base64 } = params;
        const ext = (fileName?.split(".").pop() || "jpg").toLowerCase();
        if (!["image/jpeg", "image/png", "image/webp"].includes(String(contentType)) || !/^[a-z0-9]{1,5}$/.test(ext)) return json({ error: "Use a JPG, PNG or WEBP photo" }, 400);
        if (typeof base64 !== "string" || base64.length > 20 * 1024 * 1024) return json({ error: "Photo too large" }, 400);
        const path = `rental-updates/${crypto.randomUUID()}.${ext}`;
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const { error: upErr } = await admin.storage.from("vehicle-media").upload(path, bytes, { contentType });
        if (upErr) throw upErr;
        return json({ data: { path } });
      }
      case "saveRentalUpdates": {
        const raw: any[] = Array.isArray(params.items) ? params.items.slice(0, 20) : [];
        const items = raw.map((x) => ({
          id: String(x?.id || crypto.randomUUID()).slice(0, 64),
          title: String(x?.title || "").slice(0, 120),
          body: String(x?.body || "").slice(0, 400),
          path: typeof x?.path === "string" && /^rental-updates\/[\w-]+\.[a-z0-9]{1,5}$/.test(x.path) ? x.path : null,
          image_url: typeof x?.image_url === "string" && /^(\/__l5e\/|https:\/\/)/.test(x.image_url) ? x.image_url.slice(0, 500) : null,
        })).filter((x) => x.path || x.image_url || x.title || x.body);
        const { data: s } = await admin.from("app_settings").select("value").eq("key", "rental_updates").maybeSingle();
        const old: string[] = (((s?.value as any)?.items) || []).map((x: any) => x.path).filter(Boolean);
        const removed = old.filter((p) => !items.some((x) => x.path === p));
        if (removed.length) await admin.storage.from("vehicle-media").remove(removed);
        const { error } = await admin.from("app_settings").upsert({ key: "rental_updates", value: { items } });
        if (error) throw error;
        return json({ data: { items } });
      }
      case "setHoldDeposit": {
        const amt = Number(params.amount);
        if (!Number.isFinite(amt) || amt < 0 || amt > 10000) return json({ error: "Enter a deposit between $0 and $10,000" }, 400);
        const { error } = await admin.from("app_settings").upsert({ key: "rental_hold_deposit", value: { value: Math.round(amt * 100) / 100 } });
        if (error) throw error;
        return json({ data: { depositAmount: amt } });
      }
      case "updateHold": {
        const { id, status, reference } = params;
        if (!["held", "refunded", "cancelled"].includes(status)) return json({ error: "Invalid status" }, 400);
        const patch: Record<string, unknown> = { status };
        if (status === "held") { patch.paid_at = new Date().toISOString(); patch.payment_reference = String(reference || "").slice(0, 120) || null; }
        if (status === "refunded") { patch.refunded_at = new Date().toISOString(); patch.refund_reference = String(reference || "").slice(0, 120) || null; }
        const { data, error } = await admin.from("rental_holds").update(patch).eq("id", id).select("*").single();
        if (error) throw error;
        return json({ data });
      }
      case "reviewCancellation": {
        const { id, approve } = params;
        const { data: cur, error: cErr } = await admin.from("rental_bookings").select("id, vehicle_id, cancellation_status").eq("id", id).single();
        if (cErr) throw cErr;
        if (cur.cancellation_status !== "requested") return json({ error: "No cancellation request is waiting" }, 400);
        const patch: Record<string, unknown> = { cancellation_status: approve ? "approved" : "declined", cancel_reviewed_at: new Date().toISOString() };
        if (approve) patch.status = "cancelled";
        const { data: b, error: bErr } = await admin.from("rental_bookings").update(patch).eq("id", id).select().single();
        if (bErr) throw bErr;
        if (approve && cur.vehicle_id) await admin.from("vehicles").update({ availability_status: "available" }).eq("id", cur.vehicle_id);
        return json({ data: b });
      }
      case "markPaidManual": {
        const { id, method, reference, amount, note } = params;
        if (!["cash", "cashapp"].includes(method)) return json({ error: "Choose Cash or Cash App" }, 400);
        const ref = String(reference || "").trim().slice(0, 120);
        if (method === "cashapp" && !ref) return json({ error: "Enter the Cash App payment ID or sender $cashtag" }, 400);
        if (method === "cash" && !ref) return json({ error: "Enter the name of the person who collected the cash" }, 400);
        const amt = Number(amount);
        if (!Number.isFinite(amt) || amt <= 0) return json({ error: "Enter the amount received" }, 400);
        const { data: b, error: bErr } = await admin.from("rental_bookings").select("*, vehicles(year, make, model)").eq("id", id).single();
        if (bErr) throw bErr;
        if (["paid", "active", "completed", "returned"].includes(String(b.status))) return json({ error: "This booking is already paid" }, 400);
        if (["cancelled", "rejected"].includes(String(b.status))) return json({ error: "This booking was cancelled" }, 400);
        if (amt + 0.005 < Number(b.total_price || 0)) {
          return json({ error: `Amount received ($${amt.toFixed(2)}) is less than the total due ($${Number(b.total_price).toFixed(2)})` }, 400);
        }
        const paidAt = new Date().toISOString();
        const vehicle = Array.isArray(b.vehicles) ? b.vehicles[0] : b.vehicles;
        const pdf = await buildManualPaymentReceiptPdf({
          bookingId: b.id, amount: amt, method, reference: ref, paidAt,
          vehicleLabel: [vehicle?.year, vehicle?.make, vehicle?.model].filter(Boolean).join(" "),
        });
        const paidDate = paidAt.slice(0, 10);
        const receiptPath = `${b.renter_user_id}/${b.id}/receipts/payment-receipt-${b.id}-${paidDate}.pdf`;
        const { error: receiptError } = await admin.storage.from("rental-documents").upload(receiptPath, pdf, { contentType: "application/pdf", upsert: false });
        if (receiptError) throw new Error(`Receipt generation failed: ${receiptError.message}`);
        const { data: updated, error: upErr } = await admin.from("rental_bookings").update({
          status: "paid", paid_at: paidAt, payment_method: method,
          payment_reference: ref || null, amount_received: amt,
          payment_note: String(note || "").slice(0, 500) || null,
          payment_receipt_path: receiptPath,
        }).eq("id", id).select().single();
        if (upErr) {
          await admin.storage.from("rental-documents").remove([receiptPath]);
          throw upErr;
        }
        await admin.from("vehicles").update({ availability_status: "rented" }).eq("id", b.vehicle_id);
        await createCommissions(admin, updated);
        const { data: signedReceipt } = await admin.storage.from("rental-documents").createSignedUrl(receiptPath, 300);
        let emailed = false;
        let emailError: string | null = null;
        try {
          const { data: renter } = await admin.from("users").select("email, username, first_name, last_name").eq("id", b.renter_user_id).maybeSingle();
          if (renter?.email) {
            const code = String(b.id).slice(0, 8).toUpperCase();
            const label = method === "cash" ? "Cash" : "Cash App";
            const vehicleLabel = [vehicle?.year, vehicle?.make, vehicle?.model].filter(Boolean).join(" ");
            const name = [renter.first_name, renter.last_name].filter(Boolean).join(" ") || renter.username || "";
            const esc = (v: string) => v.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
            const lines = [`Booking code: ${code}`, `Amount received: $${amt.toFixed(2)}`, `Payment method: ${label}`, `${method === "cash" ? "Collected by" : "Transaction reference"}: ${ref}`, `Vehicle: ${vehicleLabel}`, `Date received: ${paidDate}`];
            const result = await sendEmailWithAttachment(
              { email: renter.email, name },
              {
                subject: `Payment receipt - booking ${code}`,
                fromName: "Best Rental Car Service",
                category: "rental_payment_receipt",
                text: `Hi ${name},\n\nWe received your payment. Your receipt is attached.\n\n${lines.join("\n")}\n\nBest Rental Car Service`,
                html: `<div style="font-family:Arial,sans-serif;color:#111;max-width:560px"><h2 style="color:#0b1f3a">Payment received</h2><p>Hi ${esc(name)},</p><p>We received your payment. Your PDF receipt is attached.</p><ul>${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul><p>Best Rental Car Service</p></div>`,
              },
              [{ filename: `payment-receipt-${b.id}-${paidDate}.pdf`, content: pdf, type: "application/pdf" }],
            );
            emailed = result.ok;
            if (!result.ok) emailError = "Receipt email could not be sent";
          } else emailError = "Renter has no email on file";
        } catch (e) {
          console.error("receipt email failed", e);
          emailError = "Receipt email could not be sent";
        }
        return json({ data: updated, receiptUrl: signedReceipt?.signedUrl || null, emailed, emailError });
      }
      case "markReturned": {
        const { id, returnedAt, mileage, fuel, damageNotes, lateFee, depositKept, photos } = params;
        const { data: cur, error: cErr } = await admin.from("rental_bookings").select("id, security_deposit, status").eq("id", id).single();
        if (cErr) throw cErr;
        const when = returnedAt ? new Date(returnedAt) : new Date();
        if (isNaN(when.getTime())) return json({ error: "Invalid return time" }, 400);
        const deposit = Number(cur.security_deposit || 0);
        const kept = Math.max(0, Math.min(deposit, Number(depositKept) || 0));
        const fee = Math.max(0, Number(lateFee) || 0);
        const miles = mileage === "" || mileage == null ? null : parseInt(String(mileage).replace(/[^0-9]/g, ""), 10);
        const paths: string[] = [];
        for (const p of (Array.isArray(photos) ? photos.slice(0, 10) : [])) {
          if (!["image/jpeg", "image/png", "image/webp"].includes(String(p?.contentType)) || typeof p?.base64 !== "string" || p.base64.length > 15 * 1024 * 1024) return json({ error: "Photos must be JPG, PNG or WEBP under 10MB" }, 400);
          const ext = p.contentType === "image/png" ? "png" : p.contentType === "image/webp" ? "webp" : "jpg";
          const path = `returns/${id}/${crypto.randomUUID()}.${ext}`;
          const bytes = Uint8Array.from(atob(p.base64), (c) => c.charCodeAt(0));
          const { error: upErr } = await admin.storage.from("rental-documents").upload(path, bytes, { contentType: p.contentType });
          if (upErr) throw upErr;
          paths.push(path);
        }
        const { data: b, error: bErr } = await admin.from("rental_bookings").update({
          status: "completed", returned_at: when.toISOString(),
          return_mileage: Number.isFinite(miles as number) ? miles : null,
          return_fuel: fuel ? String(fuel).slice(0, 40) : null,
          return_damage_notes: damageNotes ? String(damageNotes).slice(0, 4000) : null,
          return_photo_paths: paths, late_fee_charged: fee,
          deposit_kept: kept, deposit_refunded: Math.max(0, deposit - kept),
          ...(Number.isFinite(miles as number) ? { latest_reported_mileage: miles } : {}),
        }).eq("id", id).select().single();
        if (bErr) throw bErr;
        const { error: vErr } = await admin.from("vehicles").update({ availability_status: "available" }).eq("id", b.vehicle_id);
        if (vErr) throw vErr;
        return json({ data: b });
      }
      case "verifyPaypalPayment": {
        const { id } = params;
        const { data: b, error: bErr } = await admin.from("rental_bookings").select("*").eq("id", id).single();
        if (bErr) throw bErr;
        if (!b.paypal_order_id) return json({ error: "No PayPal payment has been started for this booking" }, 400);

        const clientId = (Deno.env.get("PAYPAL_CLIENT_ID"));
        const clientSecret = (Deno.env.get("PAYPAL_CLIENT_SECRET"));
        if (!clientId || !clientSecret) return json({ error: "PayPal credentials missing" }, 400);
        const base = ((Deno.env.get("PAYPAL_ENVIRONMENT")) || "sandbox") === "live"
          ? "https://api-m.paypal.com"
          : "https://api-m.sandbox.paypal.com";

        const authRes = await fetch(`${base}/v1/oauth2/token`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: "grant_type=client_credentials",
        });
        const authJson = await authRes.json();
        if (!authRes.ok) return json({ error: "PayPal authentication failed" }, 400);

        const orderRes = await fetch(`${base}/v2/checkout/orders/${b.paypal_order_id}`, {
          headers: { Authorization: `Bearer ${authJson.access_token}` },
        });
        const orderJson = await orderRes.json();
        const capture = orderJson?.purchase_units?.[0]?.payments?.captures?.[0];
        const completed = orderJson?.status === "COMPLETED" || capture?.status === "COMPLETED";
        if (!orderRes.ok || !completed) {
          return json({ error: `PayPal payment not completed (status: ${orderJson?.status || "unknown"})` }, 400);
        }

        const alreadyPaid = ["paid", "active", "completed"].includes(String(b.status));
        const { data: updated, error: upErr } = await admin
          .from("rental_bookings")
          .update({
            status: alreadyPaid ? b.status : "paid",
            paypal_capture_id: capture?.id || b.paypal_capture_id || null,
            paid_at: b.paid_at || new Date().toISOString(),
          })
          .eq("id", id)
          .select()
          .single();
        if (upErr) throw upErr;
        if (!alreadyPaid) await createCommissions(admin, updated);
        return json({ data: updated, verified: true });
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

      case "listCallRequests": {
        const { data, error } = await admin.from("rental_call_requests").select("*").order("scheduled_date", { ascending: true }).order("scheduled_time", { ascending: true });
        if (error) throw error;
        return json({ data });
      }
      case "updateCallRequest": {
        const { id, payload } = params;
        const allowed = ["status", "notes"];
        const clean: Record<string, any> = {};
        for (const k of allowed) if (k in (payload || {})) clean[k] = payload[k];
        const { data, error } = await admin.from("rental_call_requests").update(clean).eq("id", id).select().single();
        if (error) throw error;
        return json({ data });
      }

      case "listHostApplications": {
        const { data, error } = await admin.from("host_applications").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        return json({ data });
      }
      case "updateHostApplication": {
        const { id, payload } = params;
        const clean: Record<string, any> = {};
        for (const k of ["status", "deposit_status", "notes", "earnings_total"]) if (k in (payload || {})) clean[k] = payload[k];
        const { data, error } = await admin.from("host_applications").update(clean).eq("id", id).select().single();
        if (error) throw error;
        return json({ data });
      }
      case "signHostDoc": {
        const { path } = params;
        const { data, error } = await admin.storage.from("host-documents").createSignedUrl(path, 300);
        if (error) throw error;
        return json({ url: data.signedUrl });
      }

      case "listPurchaseApplications": {
        const { data, error } = await admin.from("vehicle_purchase_applications")
          .select("*, vehicles(year,make,model)")
          .order("submitted_at", { ascending: false });
        if (error) throw error;
        const strip = (p: any) => {
          if (!p) return p;
          const { ssnEncrypted, dateOfBirth, driversLicenseNumber, ...rest } = p;
          return { ...rest, hasSsn: !!ssnEncrypted, hasDob: !!dateOfBirth, hasDl: !!driversLicenseNumber };
        };
        const ids = (data || []).map((r: any) => r.id);
        const { data: logs } = ids.length
          ? await admin.from("credit_app_reveal_log").select("application_id, admin_user_id, person, field, revealed_at").in("application_id", ids).order("revealed_at", { ascending: false }).limit(1000)
          : { data: [] as any[] };
        const adminIds = [...new Set((logs || []).map((l: any) => l.admin_user_id).filter(Boolean))];
        const names: Record<string, string> = {};
        if (adminIds.length) {
          const { data: us } = await admin.from("users").select("id, username").in("id", adminIds);
          for (const u of us || []) names[u.id] = u.username;
        }
        return json({ data: (data || []).map((r: any) => ({
          ...r, applicant: strip(r.applicant), co_buyer: strip(r.co_buyer),
          reveal_log: (logs || []).filter((l: any) => l.application_id === r.id).map((l: any) => ({ ...l, admin_username: names[l.admin_user_id] || null })),
        })) });
      }
      case "revealPurchaseSsn":
      case "revealPurchaseField": {
        const { id, who } = params;
        const field = action === "revealPurchaseSsn" ? "ssn" : String(params.field);
        if (!["ssn", "dob", "dl"].includes(field) || !["applicant", "coBuyer"].includes(who)) return json({ error: "Invalid request" }, 400);
        const { data: row } = await admin.from("vehicle_purchase_applications").select("applicant, co_buyer").eq("id", id).maybeSingle();
        const person = who === "coBuyer" ? row?.co_buyer : row?.applicant;
        const raw = field === "ssn" ? person?.ssnEncrypted : field === "dob" ? person?.dateOfBirth : person?.driversLicenseNumber;
        if (!raw) return json({ error: "Nothing on file" }, 404);
        await admin.from("credit_app_reveal_log").insert({ application_id: id, admin_user_id: adminUserId, person: who, field });
        const value = field === "ssn" ? await decryptSsn(raw) : String(raw);
        return json({ value, ssn: field === "ssn" ? value : undefined });
      }
      case "signPurchaseDoc": {
        const { id, documentId } = params;
        const { data: row } = await admin.from("vehicle_purchase_applications").select("documents").eq("id", id).maybeSingle();
        const doc = (row?.documents || []).find((d: any) => d.id === documentId);
        if (!doc) return json({ error: "Document not found" }, 404);
        const { data, error } = await admin.storage.from("credit-app-docs").createSignedUrl(doc.path, 300);
        if (error) throw error;
        return json({ url: data.signedUrl });
      }
      case "updatePurchaseApplication": {
        const { id, payload } = params;
        const clean: Record<string, any> = {};
        if (typeof payload?.status === "string" && ["new", "reviewing", "contacted", "approved", "declined", "closed"].includes(payload.status)) clean.status = payload.status;
        if (typeof payload?.admin_notes === "string") clean.admin_notes = payload.admin_notes.trim().slice(0, 2000) || null;
        if (typeof payload?.requested_items === "string") clean.requested_items = payload.requested_items.trim().slice(0, 2000) || null;
        if (!Object.keys(clean).length) return json({ error: "No valid changes supplied" }, 400);
        if (clean.status === "declined") clean.sale_status = "declined";
        if (clean.status === "approved" || clean.status === "declined") {
          // Release the reserved username unless the applicant completed /register.
          const { data: cur } = await admin.from("vehicle_purchase_applications").select("applicant").eq("id", id).maybeSingle();
          const reserved = cur?.applicant?.requestedUsername;
          if (reserved) {
            const { data: reg } = await admin.from("users").select("id").ilike("username", String(reserved).replace(/_/g, "\\_")).limit(1);
            if (!reg?.length) clean.applicant = { ...cur.applicant, requestedUsername: null, releasedUsername: reserved };
          }
        }
        const { data, error } = await admin.from("vehicle_purchase_applications").update(clean).eq("id", id).select().single();
        if (error) throw error;
        return json({ data });
      }

      case "listSaleCommissions": {
        const { data: apps, error } = await admin.from("vehicle_purchase_applications")
          .select("id, applicant, submitted_at, status, sale_status, sale_amount, sold_at, referrer_username, referrer_user_id, upline_user_id, referrer_commission, upline_commission, referrer_overridden, buyer_avatar_path, user_id")
          .order("submitted_at", { ascending: false });
        if (error) throw error;
        const ids = new Set<string>();
        for (const a of apps || []) { if (a.referrer_user_id) ids.add(a.referrer_user_id); if (a.upline_user_id) ids.add(a.upline_user_id); if (a.user_id) ids.add(a.user_id); }
        const { data: bonuses } = await admin.from("sale_commission_bonuses").select("*").order("month", { ascending: false });
        for (const b of bonuses || []) ids.add(b.user_id);
        const users: Record<string, any> = {};
        if (ids.size) {
          const { data: us } = await admin.from("users").select("id, username, profile_photo, front_page_photo").in("id", [...ids]);
          for (const u of us || []) users[u.id] = { username: u.username, avatar: u.front_page_photo || u.profile_photo || null };
        }
        const rows = await Promise.all((apps || []).map(async (a: any) => ({
          id: a.id, submitted_at: a.submitted_at, app_status: a.status, sale_status: a.sale_status,
          sale_amount: a.sale_amount, sold_at: a.sold_at,
          buyer_first: a.applicant?.firstName || "", buyer_last: a.applicant?.lastName || "",
          buyer_avatar: (await signAvatar(admin, a.buyer_avatar_path)) || (a.user_id ? users[a.user_id]?.avatar : null) || null,
          area_code: areaCode(a.applicant?.cellPhone),
          referrer_id: a.referrer_user_id, upline_id: a.upline_user_id,
          referrer_commission: Number(a.referrer_commission || 0), upline_commission: Number(a.upline_commission || 0),
          referrer_overridden: a.referrer_overridden,
        })));
        return json({ data: rows, users, bonuses: bonuses || [] });
      }
      case "markSaleSold": {
        const { id, amount, soldAt } = params;
        const amt = Number(amount);
        if (!Number.isFinite(amt) || amt <= 0 || amt > 10_000_000) return json({ error: "Enter a valid amount received." }, 400);
        const date = typeof soldAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(soldAt) ? soldAt : new Date().toISOString().slice(0, 10);
        const { data: app } = await admin.from("vehicle_purchase_applications").select("referrer_user_id, upline_user_id").eq("id", id).maybeSingle();
        if (!app) return json({ error: "Application not found" }, 404);
        const c = computeCommissions(amt, app.referrer_user_id, app.upline_user_id);
        const { error } = await admin.from("vehicle_purchase_applications").update({ sale_status: "sold", sale_amount: amt, sold_at: date, ...c }).eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }
      case "setSaleStatus": {
        const { id, saleStatus } = params;
        if (!["pending", "declined"].includes(saleStatus)) return json({ error: "Invalid status" }, 400);
        const { error } = await admin.from("vehicle_purchase_applications").update({ sale_status: saleStatus, sale_amount: null, sold_at: null, referrer_commission: 0, upline_commission: 0 }).eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }
      case "changeSaleReferrer": {
        const { id, username } = params;
        const name = typeof username === "string" ? username.trim().slice(0, 100) : "";
        if (name && name.toLowerCase() !== "company") {
          const { data: exists } = await admin.from("users").select("id").ilike("username", name).maybeSingle();
          if (!exists) return json({ error: "No member with that username." }, 400);
        }
        const chain = await resolveReferralChain(admin, name || "Company");
        const { data: app } = await admin.from("vehicle_purchase_applications").select("sale_status, sale_amount").eq("id", id).maybeSingle();
        if (!app) return json({ error: "Application not found" }, 404);
        const c = app.sale_status === "sold" ? computeCommissions(Number(app.sale_amount || 0), chain.referrerId, chain.uplineId) : { referrer_commission: 0, upline_commission: 0 };
        const { error } = await admin.from("vehicle_purchase_applications").update({
          referrer_username: chain.referrerUsername, referrer_user_id: chain.referrerId, upline_user_id: chain.uplineId, referrer_overridden: true, ...c,
        }).eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }
      case "saveSaleBonus": {
        const { userId, month, amount, note } = params;
        const amt = Number(amount);
        if (!/^[0-9a-f-]{36}$/i.test(String(userId)) || !/^\d{4}-\d{2}$/.test(String(month)) || !Number.isFinite(amt) || amt < 0 || amt > 1_000_000) return json({ error: "Invalid bonus" }, 400);
        const { error } = await admin.from("sale_commission_bonuses").upsert({
          user_id: userId, month: `${month}-01`, amount: amt, note: typeof note === "string" ? note.slice(0, 300) : null, created_by: adminUserId,
        }, { onConflict: "user_id,month" });
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

async function createCommissions(admin: any, b: any) {
  const { data: existing } = await admin.from("rental_commissions").select("id").eq("booking_id", b.id).limit(1);
  if (existing?.length) return;

  const rows: any[] = [];
  const directAmt = Number(b.total_price) * 0.10;
  const uplineAmt = Number(b.total_price) * 0.05;
  if (b.referrer_username) {
    const { data: u } = await admin.from("users").select("id").ilike("username", b.referrer_username).maybeSingle();
    if (u) rows.push({ booking_id: b.id, user_id: u.id, commission_type: "direct", amount: directAmt, status: "pending" });
  }
  if (b.upline_referrer_username) {
    const { data: u } = await admin.from("users").select("id").ilike("username", b.upline_referrer_username).maybeSingle();
    if (u) rows.push({ booking_id: b.id, user_id: u.id, commission_type: "upline", amount: uplineAmt, status: "pending" });
  }
  if (rows.length) await admin.from("rental_commissions").insert(rows);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
