import { getCallerId, AUTH_HEADERS } from "../_shared/caller.ts";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": AUTH_HEADERS, "Access-Control-Allow-Methods": "POST, OPTIONS" };
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { allowedPickupDate, minimumEndDate, monthlyRentalEndIsValid, monthlyRentalPrice } from "./rules.ts";
import { shortTermTotal } from "./shortTerm.ts";
import { rentalExtras, extrasDays } from "./extras.ts";
import { cancellationQuote } from "./cancellation.ts";
import { bookingConflict, nextAvailableDate } from "./availability.ts";

type UploadedDocument = { name?: string; type?: string; base64: string };

const UploadedDocumentSchema = z.object({
  name: z.string().max(255).optional(),
  type: z.string().max(120).optional(),
  base64: z.string().min(1),
});

const BookingPayloadSchema = z.object({
  vehicle_id: z.string().uuid(),
  rental_type: z.string().min(1).max(50),
  start_date: z.string().min(1),
  end_date: z.string().nullable().optional(),
  pickup_location: z.string().max(500).nullable().optional(),
  total_price: z.coerce.number().nonnegative(),
  down_payment_amount: z.coerce.number().nonnegative().optional().default(0),
  signature_text: z.string().max(5000).nullable().optional(),
  signed_at: z.string().nullable().optional(),
  security_deposit: z.coerce.number().nonnegative().optional().default(0),
  contact_email: z.string().max(255).nullable().optional(),
  contact_phone: z.string().max(50).nullable().optional(),
  mileage_plan: z.enum(["limited", "unlimited"]).optional().default("limited"),
  protection_plan: z.enum(["standard", "minimum", "own"]),
});

const RequestSchema = z.object({
  action: z.enum(["createBooking", "validatePromo", "createPayment", "capturePayment", "chooseManualPayment", "downloadReceipt", "quoteCancellation", "requestCancellation", "holdInfo", "listHolds", "createHold", "captureHold", "changeHoldDates", "refundHold", "getProfile", "updateProfile", "changePassword"]),
  profile: z.object({
    first_name: z.string().trim().max(80).optional(),
    last_name: z.string().trim().max(80).optional(),
    phone_number: z.string().trim().max(30).optional(),
    email: z.string().trim().email().max(255).optional(),
    drivers_license_no: z.string().trim().max(40).optional(),
    drivers_license_state: z.string().trim().max(40).optional(),
  }).optional(),
  currentPassword: z.string().max(200).optional(),
  newPassword: z.string().min(8).max(200).optional(),
  vehicleId: z.string().uuid().optional(),
  holdId: z.string().uuid().optional(),
  wantedStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  wantedEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  holdMethod: z.enum(["paypal", "cashapp"]).optional(),
  userId: z.string().uuid(),
  bookingId: z.string().uuid().optional(),
  returnUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  paypalOrderId: z.string().max(120).optional(),
  method: z.enum(["cash", "cashapp"]).optional(),
  promoCode: z.string().max(60).nullable().optional(),
  subtotal: z.coerce.number().nonnegative().optional(),
  booking: BookingPayloadSchema.optional(),
  documentFiles: z
    .object({
      license: UploadedDocumentSchema.optional(),
      insurance: UploadedDocumentSchema.optional(),
    })
    .optional(),
  addonPackageIds: z.array(z.string().uuid()).optional().default([]),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const log = (requestId: string, message: string, details?: Record<string, unknown>) => {
  console.log(`[rental-booking:${requestId}] ${message}`, details ?? {});
};

const logError = (requestId: string, message: string, error: unknown, details?: Record<string, unknown>) => {
  console.error(`[rental-booking:${requestId}] ${message}`, {
    error,
    ...details,
  });
};

const redactDocument = (file?: UploadedDocument) =>
  file
    ? {
        name: file.name,
        type: file.type,
        base64Length: file.base64.length,
      }
    : null;

const cleanExt = (fileName?: string) => {
  const raw = fileName?.split(".").pop()?.toLowerCase() || "bin";
  return raw.replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
};

const decodeBase64 = (value: string) => {
  const base64 = value.includes(",") ? value.split(",").pop() || "" : value;
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
};

const paypalBase = () =>
  ((Deno.env.get("PAYPAL_ENVIRONMENT")) || "sandbox") === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

const paypalToken = async (requestId: string) => {
  const clientId = (Deno.env.get("PAYPAL_CLIENT_ID"));
  const clientSecret = (Deno.env.get("PAYPAL_CLIENT_SECRET"));
  if (!clientId || !clientSecret) throw new Error("PayPal credentials missing");

  const res = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const body = await res.json();
  if (!res.ok) {
    logError(requestId, "paypal auth failed", body);
    throw new Error("PayPal authentication failed");
  }
  return body.access_token as string;
};

const rentalDaysBetween = (start: string, end?: string | null) => {
  if (!end) throw new Error("Return date is required");
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
    throw new Error("Return date must be after pickup date");
  }
  return Math.max(1, Math.ceil((endTime - startTime) / 86_400_000));
};

const calculateBaseRentalTotal = (vehicle: any, rentalType: string, start: string, end?: string | null) => {
  if (rentalType === "long_term" || rentalType === "rent_to_own") {
    return Math.max(0, Number(vehicle.down_payment || 0));
  }

  const days = rentalDaysBetween(start, end);
  const minimumDays = rentalType === "weekly" ? 7 : 1;
  return shortTermTotal(vehicle, Math.max(days, minimumDays));
};

const createServiceClient = (requestId: string) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const isOpaqueServiceKey = serviceRoleKey.startsWith("sb_secret_");

  const serviceFetch: typeof fetch = (input, init = {}) => {
    const headers = new Headers(init.headers);
    headers.set("apikey", serviceRoleKey);

    if (isOpaqueServiceKey) {
      // Newer opaque service keys identify the request through the apikey header.
      // Do not send `Authorization: Bearer sb_secret_...`; PostgREST can treat
      // that as a caller token instead of the service identity.
      headers.delete("authorization");
    } else {
      // Legacy JWT service-role keys should be sent as the bearer token.
      headers.set("Authorization", `Bearer ${serviceRoleKey}`);
    }

    return fetch(input, { ...init, headers });
  };

  log(requestId, "service client initialized", {
    hasSupabaseUrl: Boolean(supabaseUrl),
    serviceKeyType: isOpaqueServiceKey ? "opaque" : "jwt",
  });

  // Correct server-side service client. Never use req.headers.Authorization,
  // never sign in on this client, and never expose this key to the browser.
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: serviceFetch,
      headers: {
        apikey: serviceRoleKey,
        ...(isOpaqueServiceKey ? {} : { Authorization: `Bearer ${serviceRoleKey}` }),
      },
    },
  });
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const requestId = crypto.randomUUID();

  if (req.method !== "POST") {
    return json({ error: "Method not allowed", requestId }, 405);
  }

  try {
    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      logError(requestId, "invalid request payload", parsed.error.flatten(), {
        bodyKeys: body && typeof body === "object" ? Object.keys(body) : [],
      });
      return json({ error: "Invalid booking payload", fields: parsed.error.flatten().fieldErrors, requestId }, 400);
    }

    const {
      action,
      userId,
      booking,
      documentFiles,
      addonPackageIds,
      promoCode,
      subtotal,
      bookingId,
      returnUrl,
      cancelUrl,
      paypalOrderId,
    } = parsed.data;
    {
      const _caller = await getCallerId(req);
      if (!_caller || _caller !== userId) return json({ error: "Please sign in again to continue.", requestId }, 401);
    }
    const admin = createServiceClient(requestId);

    // A Notify Me deposit is only consumed once its booking is paid. Release deposits
    // attached to bookings that are still unpaid (abandoned, replaced or cancelled checkout).
    if (userId && ["createBooking", "listHolds", "changeHoldDates", "refundHold"].includes(action)) {
      try {
        const { data: applied } = await admin.from("rental_holds").select("id, applied_booking_id")
          .eq("user_id", userId).eq("status", "applied").not("applied_booking_id", "is", null);
        const ids = (applied || []).map((h: any) => h.applied_booking_id);
        if (ids.length) {
          const { data: bks } = await admin.from("rental_bookings").select("id, status, paid_at").in("id", ids);
          const pendingIds = new Set<string>();
          for (const b of bks || []) {
            const paid = Boolean(b.paid_at) || ["paid", "confirmed", "active", "completed"].includes(String(b.status));
            if (!paid) pendingIds.add(b.id);
          }
          for (const h of applied || []) {
            if (!pendingIds.has(h.applied_booking_id)) continue;
            await admin.from("rental_holds").update({ status: "held", applied_booking_id: null }).eq("id", h.id).eq("status", "applied");
            // The unpaid booking no longer carries the credit, so restore its full price.
            const { data: ob } = await admin.from("rental_bookings").select("total_price, hold_credit").eq("id", h.applied_booking_id).maybeSingle();
            if (ob && Number(ob.hold_credit || 0) > 0) {
              await admin.from("rental_bookings").update({
                hold_credit: 0,
                total_price: Math.round((Number(ob.total_price || 0) + Number(ob.hold_credit || 0)) * 100) / 100,
              }).eq("id", h.applied_booking_id).is("paid_at", null);
            }
          }
        }
      } catch (e) { logError(requestId, "release unpaid hold credits failed", e); }
    }

    log(requestId, "request received", {
      action,
      hasUserId: Boolean(userId),
      hasAuthorizationHeader: Boolean(req.headers.get("authorization")),
      hasApiKeyHeader: Boolean(req.headers.get("apikey")),
      documentFiles: {
        license: redactDocument(documentFiles?.license),
        insurance: redactDocument(documentFiles?.insurance),
      },
      addonCount: addonPackageIds.length,
    });

    const { data: userRow, error: userErr } = await admin
      .from("users")
      .select("id, username, referred_by")
      .eq("id", userId)
      .maybeSingle();

    if (userErr) {
      logError(requestId, "user verification query failed", userErr, { userId });
      return json({ error: "Could not verify user", requestId }, 500);
    }

    if (!userRow) {
      log(requestId, "invalid user id", { userId });
      return json({ error: "Invalid user", requestId }, 401);
    }

    const resolvePromo = async (rawCode: string, amount: number) => {
      const code = rawCode.trim().toUpperCase();
      if (!code) return { error: "Enter a promo code" } as const;

      const { data: promo, error: promoErr } = await admin
        .from("promo_codes")
        .select("*")
        .eq("code", code)
        .maybeSingle();

      if (promoErr) {
        logError(requestId, "promo lookup failed", promoErr, { code });
        return { error: "Could not check that promo code" } as const;
      }
      if (!promo || !promo.is_active) return { error: "Invalid promo code" } as const;
      if (promo.expires_at && new Date(promo.expires_at) < new Date()) return { error: "This promo code has expired" } as const;
      if (promo.max_uses != null && Number(promo.uses_count || 0) >= Number(promo.max_uses)) {
        return { error: "This promo code is no longer available" } as const;
      }

      const { data: used } = await admin
        .from("promo_code_redemptions")
        .select("id")
        .eq("promo_code_id", promo.id)
        .eq("user_id", userId)
        .maybeSingle();

      if (used) return { error: "You have already used this promo code" } as const;

      const value = Number(promo.discount_value) || 0;
      const discount = promo.discount_type === "amount"
        ? Math.min(value, amount)
        : Math.min(Math.round(amount * value) / 100, amount);

      return { promo, discount: Math.max(0, Math.round(discount * 100) / 100) } as const;
    };

    switch (action) {
      case "validatePromo": {
        const result = await resolvePromo(String(promoCode || ""), Number(subtotal || 0));
        if ("error" in result) return json({ error: result.error, requestId }, 200);
        return json({
          data: {
            code: result.promo.code,
            discount_type: result.promo.discount_type,
            discount_value: Number(result.promo.discount_value) || 0,
            discount: result.discount,
          },
          requestId,
        });
      }
      case "createBooking": {
        if (!booking) return json({ error: "Missing booking payload", requestId }, 400);

        const { data: vehicle, error: vehicleErr } = await admin
          .from("vehicles")
          .select("id, vin, mileage, registration_state, license_plate, plate_expiration, body_style, color, day_rate, three_day_rate, weekly_rate, monthly_rate, down_payment, security_deposit, rental_options, is_active, extra_mile_fee, unlimited_mileage_rate")
          .eq("id", booking.vehicle_id)
          .maybeSingle();
        if (vehicleErr || !vehicle || !vehicle.is_active) {
          return json({ error: "This vehicle is not available", requestId }, 400);
        }
        if (!Array.isArray(vehicle.rental_options) || !vehicle.rental_options.includes(booking.rental_type)) {
          return json({ error: "That rental option is not available for this vehicle", requestId }, 400);
        }
        if (!allowedPickupDate(booking.start_date)) {
          return json({ error: "Pickup must be scheduled from today through the next 28 days", requestId }, 400);
        }
        if (!booking.end_date) return json({ error: "A return or contract end date is required", requestId }, 400);
        {
          const { data: others } = await admin.from("rental_bookings").select("start_date, end_date")
            .eq("vehicle_id", booking.vehicle_id).in("status", ["paid", "active"]).neq("renter_user_id", userId);
          const conflict = bookingConflict(others || [], new Date(booking.start_date).getTime(), new Date(booking.end_date).getTime(), Date.now());
          if (conflict) return json({ error: conflict, requestId }, 400);
        }
        if (booking.rental_type !== "long_term" && booking.rental_type !== "rent_to_own" && !monthlyRentalEndIsValid(booking.start_date, booking.end_date)) {
          return json({ error: "Bookings may run no more than 30 days. Choose 6 months or lease to own for longer.", requestId }, 400);
        }
        if (!booking.signature_text?.trim() || !booking.signed_at) {
          return json({ error: "Review and sign the rental agreement before continuing", requestId }, 400);
        }
        if (booking.rental_type === "long_term" || booking.rental_type === "rent_to_own") {
          const requiredEnd = minimumEndDate(booking.start_date, booking.rental_type);
          if (!requiredEnd || new Date(booking.end_date).getTime() < requiredEnd.getTime()) {
            return json({ error: booking.rental_type === "rent_to_own" ? "Rent-to-own requires a 48-month term" : "Long-term rentals require at least six months", requestId }, 400);
          }
          const requiredVehicleFields = ["vin", "mileage", "registration_state", "license_plate", "plate_expiration", "body_style", "color", "monthly_rate", "down_payment"];
          const missing = requiredVehicleFields.filter((field) => !vehicle[field]);
          if (missing.length) return json({ error: `Best Rental Car Service must complete the vehicle agreement details: ${missing.join(", ")}`, requestId }, 400);
        }

        const baseRentalTotal = calculateBaseRentalTotal(
          vehicle,
          booking.rental_type,
          booking.start_date,
          booking.end_date,
        );
        const { data: selectedPackages, error: packageLookupErr } = addonPackageIds.length
          ? await admin.from("themed_packages").select("id, name, price").in("id", addonPackageIds)
          : { data: [], error: null };
        if (packageLookupErr) {
          logError(requestId, "themed package lookup failed", packageLookupErr, { addonPackageIds });
          return json({ error: "Could not verify selected add-ons", requestId }, 400);
        }
        if ((selectedPackages || []).length !== addonPackageIds.length) {
          return json({ error: "One or more selected add-ons are unavailable", requestId }, 400);
        }
        const addonTotal = (selectedPackages || []).reduce(
          (sum: number, item: any) => sum + Math.max(0, Number(item.price || 0)),
          0,
        );
        if (booking.protection_plan === "own" && !documentFiles?.insurance) {
          return json({ error: "Upload your insurance card to use your own insurance", requestId }, 400);
        }
        if (booking.mileage_plan === "unlimited" && !(Number(vehicle.unlimited_mileage_rate) > 0)) {
          return json({ error: "Unlimited mileage is not offered for this vehicle", requestId }, 400);
        }
        const extras = rentalExtras(vehicle, booking.mileage_plan, booking.protection_plan,
          extrasDays(booking.rental_type, rentalDaysBetween(booking.start_date, booking.end_date)));
        const verifiedSubtotal = Math.round((baseRentalTotal + addonTotal + extras.total) * 100) / 100;

        const uploadDocument = async (file: UploadedDocument, label: "license" | "insurance") => {
          const okDocTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
          if (!okDocTypes.includes(String(file.type || "").toLowerCase())) throw new Error("Documents must be an image or PDF");
          if (String((file as any).base64 ?? (file as any).data ?? "").length > 14 * 1024 * 1024) throw new Error("Document too large (10MB max)");
          const path = `${userId}/${crypto.randomUUID()}-${label}.${cleanExt(file.name)}`;
          log(requestId, "uploading rental document", {
            bucket: "rental-documents",
            label,
            path,
            contentType: file.type || "application/octet-stream",
          });

          const { error } = await admin.storage
            .from("rental-documents")
            .upload(path, decodeBase64(file.base64), {
              contentType: file.type || "application/octet-stream",
              upsert: false,
            });

          if (error) {
            logError(requestId, `document upload failed (${label})`, error, { path, contentType: file.type });
            throw new Error(`Document upload failed: ${error.message}`);
          }

          return path;
        };

        const licensePath = documentFiles?.license
          ? await uploadDocument(documentFiles.license, "license")
          : null;
        const insurancePath = documentFiles?.insurance
          ? await uploadDocument(documentFiles.insurance, "insurance")
          : null;

        // Derive referral chain server-side. Never trust client-supplied referral fields.
        const directRef = userRow.referred_by || null;
        let uplineRef: string | null = null;

        if (directRef) {
          const { data: refRow, error: refErr } = await admin
            .from("users")
            .select("referred_by")
            .ilike("username", directRef)
            .maybeSingle();

          if (refErr) logError(requestId, "upline referral lookup failed", refErr, { directRef });
          uplineRef = refRow?.referred_by || null;
        }

        let appliedPromo: any = null;
        let discountAmount = 0;
        if (promoCode) {
          const result = await resolvePromo(String(promoCode), verifiedSubtotal);
          if ("error" in result) return json({ error: result.error, requestId }, 400);
          appliedPromo = result.promo;
          discountAmount = result.discount;
        }

        const { data: heldDeposit } = await admin.from("rental_holds").select("id, amount")
          .eq("user_id", userId).eq("vehicle_id", booking.vehicle_id).in("status", ["held", "refundable"])
          .order("created_at").limit(1).maybeSingle();
        const holdCredit = heldDeposit ? Math.min(Number(heldDeposit.amount || 0), Math.max(0, verifiedSubtotal - discountAmount)) : 0;



        const insertPayload = {
          vehicle_id: booking.vehicle_id,
          rental_type: booking.rental_type,
          start_date: booking.start_date,
          end_date: booking.end_date || null,
          pickup_location: booking.pickup_location || null,
          total_price: Math.round((Math.max(0, verifiedSubtotal - discountAmount - holdCredit) + Math.max(0, Number(vehicle.security_deposit || 0))) * 100) / 100,
          hold_credit: holdCredit,
          hold_id: heldDeposit?.id || null,
          down_payment_amount:
            booking.rental_type === "long_term" || booking.rental_type === "rent_to_own"
              ? Math.max(0, Number(vehicle.down_payment || 0)) + addonTotal
              : 0,
          security_deposit: Math.max(0, Number(vehicle.security_deposit || 0)),
          promo_code: appliedPromo?.code || null,
          discount_amount: discountAmount,
          signature_text: booking.signature_text || null,
          signed_at: booking.signed_at || new Date().toISOString(),
          license_path: licensePath || null,
          insurance_path: insurancePath || null,
          renter_user_id: userId,
          referrer_username: directRef,
          upline_referrer_username: uplineRef,
          contact_email: booking.contact_email || null,
          contact_phone: booking.contact_phone || null,
          mileage_plan: booking.mileage_plan,
          mileage_total: extras.mileageTotal,
          protection_plan: booking.protection_plan,
          protection_total: extras.protectionTotal,
          status: "pending",
        };

        log(requestId, "inserting rental booking with service role", {
          payload: insertPayload,
          addonCount: Array.isArray(addonPackageIds) ? addonPackageIds.length : 0,
        });

        const { data: bookingRow, error: insErr } = await admin
          .from("rental_bookings")
          .insert(insertPayload)
          .select("*")
          .single();

        if (insErr) {
          logError(requestId, "rental_bookings insert failed", insErr, { payload: insertPayload });
          return json(
            {
              error: insErr.message,
              code: insErr.code,
              details: insErr.details,
              hint: insErr.hint,
              requestId,
            },
            500,
          );
        }

        if (bookingRow?.id && selectedPackages?.length) {
          const rows = selectedPackages.map((p: any) => ({
            booking_id: bookingRow.id,
            package_id: p.id,
            name_snapshot: p.name,
            price_snapshot: p.price,
          }));

          if (rows.length) {
            const { error: addonErr } = await admin.from("booking_addons").insert(rows);
            if (addonErr) logError(requestId, "booking_addons insert failed", addonErr, { rows });
          }
        }

        if (appliedPromo && bookingRow?.id) {
          const { error: redErr } = await admin.from("promo_code_redemptions").insert({
            promo_code_id: appliedPromo.id,
            user_id: userId,
            booking_id: bookingRow.id,
          });
          if (redErr) logError(requestId, "promo redemption insert failed", redErr, { code: appliedPromo.code });
          else {
            await admin
              .from("promo_codes")
              .update({ uses_count: Number(appliedPromo.uses_count || 0) + 1 })
              .eq("id", appliedPromo.id);
          }
        }

        if (heldDeposit && bookingRow?.id) {
          await admin.from("rental_holds").update({ status: "applied", applied_booking_id: bookingRow.id }).eq("id", heldDeposit.id);
        }

        log(requestId, "booking created", { bookingId: bookingRow.id });
        return json({ data: bookingRow, requestId });
      }
      case "createPayment": {
        if (!bookingId || !returnUrl || !cancelUrl) {
          return json({ error: "Missing payment details", requestId }, 400);
        }

        const { data: bk, error: bkErr } = await admin
          .from("rental_bookings")
          .select("id, renter_user_id, total_price, status, vehicle_id")
          .eq("id", bookingId)
          .maybeSingle();

        if (bkErr) {
          logError(requestId, "booking lookup failed", bkErr, { bookingId });
          return json({ error: "Could not load booking", requestId }, 500);
        }
        if (!bk || bk.renter_user_id !== userId) return json({ error: "Booking not found", requestId }, 404);
        if (["paid", "active", "completed"].includes(String(bk.status))) {
          return json({ error: "This booking is already paid", requestId }, 400);
        }

        const amount = Number(bk.total_price) || 0;
        if (amount <= 0) return json({ error: "Nothing to pay for this booking", requestId }, 400);

        const token = await paypalToken(requestId);
        const res = await fetch(`${paypalBase()}/v2/checkout/orders`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            intent: "CAPTURE",
            purchase_units: [
              {
                custom_id: `rental_${bk.id}`,
                description: "Dimes Only vehicle rental",
                amount: { currency_code: "USD", value: amount.toFixed(2) },
              },
            ],
            application_context: {
              brand_name: "Dimes Only Rentals",
              user_action: "PAY_NOW",
              shipping_preference: "NO_SHIPPING",
              return_url: returnUrl,
              cancel_url: cancelUrl,
            },
          }),
        });
        const orderJson = await res.json();
        if (!res.ok) {
          logError(requestId, "paypal order create failed", orderJson, { bookingId });
          const restricted = JSON.stringify(orderJson || {}).includes("PAYEE_ACCOUNT_RESTRICTED");
          return json({ error: restricted
            ? "PayPal checkout is temporarily unavailable. Please pay with Cash App or cash at pickup."
            : "Could not start PayPal checkout", requestId }, 400);
        }

        await admin.from("rental_bookings").update({ paypal_order_id: orderJson.id }).eq("id", bk.id);

        const approve = (orderJson.links || []).find((l: any) => l.rel === "approve")?.href;
        return json({ data: { paypal_order_id: orderJson.id, approve_url: approve }, requestId });
      }
      case "capturePayment": {
        if (!bookingId || !paypalOrderId) return json({ error: "Missing payment reference", requestId }, 400);

        const { data: bk } = await admin
          .from("rental_bookings")
          .select("id, renter_user_id, status, paypal_order_id, vehicle_id")
          .eq("id", bookingId)
          .maybeSingle();

        if (!bk || bk.renter_user_id !== userId) return json({ error: "Booking not found", requestId }, 404);
        if (bk.paypal_order_id && bk.paypal_order_id !== paypalOrderId) {
          return json({ error: "Payment reference mismatch", requestId }, 400);
        }
        if (["paid", "active", "completed"].includes(String(bk.status))) {
          return json({ data: { status: bk.status, alreadyPaid: true }, requestId });
        }

        const token = await paypalToken(requestId);
        const capRes = await fetch(`${paypalBase()}/v2/checkout/orders/${paypalOrderId}/capture`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        const capJson = await capRes.json();
        const capture = capJson?.purchase_units?.[0]?.payments?.captures?.[0];
        const completed = capJson?.status === "COMPLETED" || capture?.status === "COMPLETED";

        if (!capRes.ok || !completed) {
          logError(requestId, "paypal capture not completed", capJson, { bookingId });
          return json({ error: "PayPal payment was not completed", requestId }, 400);
        }

        await admin
          .from("rental_bookings")
          .update({
            status: "paid",
            paypal_capture_id: capture?.id || null,
            paid_at: new Date().toISOString(),
            payment_method: "paypal",
          })
          .eq("id", bk.id);
        if (bk.vehicle_id) await admin.from("vehicles").update({ availability_status: "rented" }).eq("id", bk.vehicle_id);

        return json({ data: { status: "paid", capture_id: capture?.id || null }, requestId });
      }
      case "quoteCancellation":
      case "requestCancellation": {
        if (!bookingId) return json({ error: "Booking not found", requestId }, 404);
        const { data: bk } = await admin.from("rental_bookings")
          .select("id, renter_user_id, status, start_date, end_date, created_at, paid_at, amount_received, total_price, cancellation_status, vehicles(day_rate)")
          .eq("id", bookingId).maybeSingle();
        if (!bk || bk.renter_user_id !== userId) return json({ error: "Booking not found", requestId }, 404);
        const st = String(bk.status);
        if (["cancelled", "rejected", "completed", "returned", "active"].includes(st)) return json({ error: "This booking can't be cancelled", requestId }, 400);
        if (bk.cancellation_status === "requested") return json({ error: "A cancellation request is already waiting for admin approval", requestId }, 400);
        const v: any = Array.isArray(bk.vehicles) ? bk.vehicles[0] : bk.vehicles;
        const paid = bk.paid_at || st === "paid" ? Number(bk.amount_received ?? bk.total_price ?? 0) : 0;
        const quote = cancellationQuote({
          now: Date.now(), bookedAt: new Date(bk.created_at).getTime(), startAt: new Date(bk.start_date).getTime(),
          endAt: bk.end_date ? new Date(bk.end_date).getTime() : null, dailyRent: Number(v?.day_rate || 0), amountPaid: paid,
        });
        if (action === "quoteCancellation") return json({ data: { ...quote, amountPaid: paid }, requestId });
        const { error: upErr } = await admin.from("rental_bookings").update({
          cancellation_status: "requested", cancellation_fee: quote.fee, cancellation_refund: quote.refund,
          cancellation_reason: quote.explanation, cancel_requested_at: new Date().toISOString(),
        }).eq("id", bk.id);
        if (upErr) throw upErr;
        return json({ data: { ...quote, amountPaid: paid }, requestId });
      }
      case "getProfile": {
        const { data, error } = await admin.from("users")
          .select("username, first_name, last_name, phone_number, email, drivers_license_no, drivers_license_state")
          .eq("id", userId).maybeSingle();
        if (error) throw error;
        return json({ data: data || null, requestId });
      }
      case "updateProfile": {
        const p = parsed.data.profile || {};
        const patch: Record<string, string | null> = {};
        for (const k of ["first_name", "last_name", "phone_number", "drivers_license_no", "drivers_license_state"] as const) {
          if (p[k] !== undefined) patch[k] = p[k] || null;
        }
        if (p.email) {
          const email = p.email.toLowerCase();
          const { data: taken } = await admin.from("users").select("id").ilike("email", email).neq("id", userId).limit(1);
          if (taken?.length) return json({ error: "That email is already used by another account.", requestId }, 400);
          const { error: authErr } = await admin.auth.admin.updateUserById(userId, { email, email_confirm: true });
          if (authErr) return json({ error: "Could not change your email. Please try again.", requestId }, 400);
          patch.email = email;
        }
        patch.updated_at = new Date().toISOString();
        const { error } = await admin.from("users").update(patch).eq("id", userId);
        if (error) throw error;
        return json({ data: { ok: true }, requestId });
      }
      case "changePassword": {
        const { currentPassword, newPassword } = parsed.data;
        if (!currentPassword || !newPassword) return json({ error: "Enter your current and new password.", requestId }, 400);
        const bcrypt = (await import("https://esm.sh/bcryptjs@2.4.3")).default;
        const { data: u } = await admin.from("users").select("password_hash").eq("id", userId).maybeSingle();
        if (!u?.password_hash || !bcrypt.compareSync(currentPassword, u.password_hash)) {
          return json({ error: "Your current password is incorrect.", requestId }, 400);
        }
        const hash = bcrypt.hashSync(newPassword, bcrypt.genSaltSync(12));
        const { error: authErr } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
        if (authErr) return json({ error: "Could not change your password. Please try again.", requestId }, 400);
        const { error } = await admin.from("users").update({ password_hash: hash, hash_type: "bcrypt" }).eq("id", userId);
        if (error) throw error;
        return json({ data: { ok: true }, requestId });
      }
      case "holdInfo":
      case "listHolds":
      case "createHold":
      case "captureHold":
      case "changeHoldDates":
      case "refundHold": {
        const { vehicleId, holdId, wantedStart, wantedEnd, holdMethod } = parsed.data;
        const { data: setting } = await admin.from("app_settings").select("value").eq("key", "rental_hold_deposit").maybeSingle();
        const depositAmount = Math.max(0, Number((setting?.value as any)?.value ?? 150));
        const vehicleWindow = async (vid: string) => {
          const { data } = await admin.from("rental_bookings").select("start_date, end_date").eq("vehicle_id", vid).in("status", ["paid", "active"]);
          return nextAvailableDate(data || [], Date.now());
        };
        const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const checkDates = async (vid: string) => {
          if (!wantedStart || !wantedEnd) return "Choose the dates you want the car";
          const first = ymd(await vehicleWindow(vid));
          if (wantedStart < first) return `The earliest date you can hold is ${first}`;
          if (wantedEnd < wantedStart) return "Return date must be after the start date";
          if ((new Date(wantedEnd).getTime() - new Date(wantedStart).getTime()) / 86_400_000 > 30) return "Holds can cover up to 30 days";
          return null;
        };
        if (action === "holdInfo") {
          if (!vehicleId) return json({ error: "Vehicle is required", requestId }, 400);
          return json({ data: { depositAmount, firstDate: ymd(await vehicleWindow(vehicleId)) }, requestId });
        }
        if (action === "listHolds") {
          const { data } = await admin.from("rental_holds").select("*, vehicles(year, make, model)").eq("user_id", userId).neq("status", "cancelled").order("created_at", { ascending: false });
          return json({ data: data || [], requestId });
        }
        if (action === "createHold") {
          if (!vehicleId || !holdMethod) return json({ error: "Choose a payment method", requestId }, 400);
          const bad = await checkDates(vehicleId);
          if (bad) return json({ error: bad, requestId }, 400);
          if (depositAmount <= 0) return json({ error: "Holds are not available right now", requestId }, 400);
          const { data: hold, error: hErr } = await admin.from("rental_holds").insert({ vehicle_id: vehicleId, user_id: userId, wanted_start: wantedStart, wanted_end: wantedEnd, amount: depositAmount, payment_method: holdMethod }).select("*").single();
          if (hErr) throw hErr;
          if (holdMethod === "cashapp") return json({ data: { hold }, requestId });
          if (!returnUrl || !cancelUrl) return json({ error: "Missing payment details", requestId }, 400);
          const token = await paypalToken(requestId);
          const res = await fetch(`${paypalBase()}/v2/checkout/orders`, {
            method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ intent: "CAPTURE", purchase_units: [{ custom_id: `hold_${hold.id}`, description: "Dimes Only rental hold deposit", amount: { currency_code: "USD", value: depositAmount.toFixed(2) } }],
              application_context: { brand_name: "Dimes Only Rentals", user_action: "PAY_NOW", shipping_preference: "NO_SHIPPING", return_url: `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}holdId=${hold.id}`, cancel_url: cancelUrl } }),
          });
          const order = await res.json();
          if (!res.ok) { logError(requestId, "hold order failed", order); return json({ error: "Could not start PayPal checkout. Try Cash App.", requestId }, 400); }
          await admin.from("rental_holds").update({ paypal_order_id: order.id }).eq("id", hold.id);
          return json({ data: { hold, approve_url: (order.links || []).find((l: any) => l.rel === "approve")?.href }, requestId });
        }
        if (!holdId) return json({ error: "Hold not found", requestId }, 404);
        const { data: h } = await admin.from("rental_holds").select("*").eq("id", holdId).maybeSingle();
        if (!h || h.user_id !== userId) return json({ error: "Hold not found", requestId }, 404);
        if (action === "captureHold") {
          if (h.status !== "pending_payment") return json({ data: h, requestId });
          if (!paypalOrderId || h.paypal_order_id !== paypalOrderId) return json({ error: "Payment reference mismatch", requestId }, 400);
          const token = await paypalToken(requestId);
          const capRes = await fetch(`${paypalBase()}/v2/checkout/orders/${paypalOrderId}/capture`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
          const capJson = await capRes.json();
          const capture = capJson?.purchase_units?.[0]?.payments?.captures?.[0];
          if (!capRes.ok || capture?.status !== "COMPLETED") { logError(requestId, "hold capture failed", capJson); return json({ error: "PayPal payment was not completed", requestId }, 400); }
          const { data } = await admin.from("rental_holds").update({ status: "held", paypal_capture_id: capture.id, paid_at: new Date().toISOString() }).eq("id", h.id).select("*").single();
          return json({ data, requestId });
        }
        if (!["held", "refundable"].includes(h.status)) return json({ error: "This hold can't be changed", requestId }, 400);
        if (action === "changeHoldDates") {
          const bad = await checkDates(h.vehicle_id);
          if (bad) return json({ error: bad, requestId }, 400);
          const { data } = await admin.from("rental_holds").update({ wanted_start: wantedStart, wanted_end: wantedEnd, status: "held" }).eq("id", h.id).select("*").single();
          return json({ data, requestId });
        }
        if (h.payment_method === "paypal" && h.paypal_capture_id) {
          const token = await paypalToken(requestId);
          const rRes = await fetch(`${paypalBase()}/v2/payments/captures/${h.paypal_capture_id}/refund`, {
            method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "PayPal-Request-Id": `hold-refund-${h.id}` },
            body: JSON.stringify({ amount: { currency_code: "USD", value: Number(h.amount).toFixed(2) } }),
          });
          const rJson = await rRes.json();
          if (!rRes.ok || !["COMPLETED", "PENDING"].includes(rJson?.status)) { logError(requestId, "hold refund failed", rJson); return json({ error: "PayPal couldn't process the refund. Our team will follow up.", requestId }, 400); }
          const { data } = await admin.from("rental_holds").update({ status: "refunded", refund_reference: rJson.id, refunded_at: new Date().toISOString() }).eq("id", h.id).select("*").single();
          return json({ data, requestId });
        }
        const { data } = await admin.from("rental_holds").update({ status: "refund_requested" }).eq("id", h.id).select("*").single();
        return json({ data, requestId });
      }
      case "chooseManualPayment": {
        const method = String(parsed.data.method || "");
        if (!bookingId || !["cash", "cashapp"].includes(method)) return json({ error: "Choose Cash or Cash App", requestId }, 400);
        const { data: bk } = await admin.from("rental_bookings").select("id, renter_user_id, status").eq("id", bookingId).maybeSingle();
        if (!bk || bk.renter_user_id !== userId) return json({ error: "Booking not found", requestId }, 404);
        if (["paid", "active", "completed", "returned"].includes(String(bk.status))) return json({ error: "This booking is already paid", requestId }, 400);
        await admin.from("rental_bookings").update({ payment_method: method }).eq("id", bk.id);
        return json({ data: { payment_method: method }, requestId });
      }
      case "downloadReceipt": {
        if (!bookingId) return json({ error: "Booking is required", requestId }, 400);
        const { data: bk } = await admin.from("rental_bookings")
          .select("renter_user_id, status, payment_method, payment_receipt_path")
          .eq("id", bookingId).maybeSingle();
        if (!bk || bk.renter_user_id !== userId) return json({ error: "Receipt not found", requestId }, 404);
        if (!["cash", "cashapp"].includes(String(bk.payment_method)) || !bk.payment_receipt_path || !["paid", "active", "completed", "returned"].includes(String(bk.status))) {
          return json({ error: "Receipt not found", requestId }, 404);
        }
        const { data, error } = await admin.storage.from("rental-documents").createSignedUrl(bk.payment_receipt_path, 300);
        if (error || !data?.signedUrl) return json({ error: "Could not prepare receipt", requestId }, 500);
        return json({ data: { url: data.signedUrl }, requestId });
      }
      default:
        return json({ error: "Unknown action", requestId }, 400);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    logError(requestId, "unhandled error", e);
    return json({ error: message, requestId }, 500);
  }
});
