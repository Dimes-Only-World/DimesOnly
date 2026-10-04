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
        const { id } = params;
        const returnedAt = new Date().toISOString();
        const { data: b, error: bErr } = await admin.from("rental_bookings").update({ status: "returned", returned_at: returnedAt }).eq("id", id).select().single();
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
        const strip = (p: any) => { if (!p) return p; const { ssnEncrypted, ...rest } = p; return { ...rest, hasSsn: !!ssnEncrypted }; };
        return json({ data: (data || []).map((r: any) => ({ ...r, applicant: strip(r.applicant), co_buyer: strip(r.co_buyer) })) });
      }
      case "revealPurchaseSsn": {
        const { id, who } = params;
        const { data: row } = await admin.from("vehicle_purchase_applications").select("applicant, co_buyer").eq("id", id).maybeSingle();
        const enc = (who === "coBuyer" ? row?.co_buyer : row?.applicant)?.ssnEncrypted;
        if (!enc) return json({ error: "No Social Security number on file" }, 404);
        console.log("ssn_reveal", { adminUserId, id, who });
        return json({ ssn: await decryptSsn(enc) });
      }
      case "updatePurchaseApplication": {
        const { id, payload } = params;
        const clean: Record<string, any> = {};
        if (typeof payload?.status === "string" && ["new", "reviewing", "contacted", "approved", "declined", "closed"].includes(payload.status)) clean.status = payload.status;
        if (typeof payload?.admin_notes === "string") clean.admin_notes = payload.admin_notes.trim().slice(0, 2000) || null;
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
