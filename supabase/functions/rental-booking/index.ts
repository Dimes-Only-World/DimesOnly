import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "https://esm.sh/zod@3.23.8";

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
});

const RequestSchema = z.object({
  action: z.enum(["createBooking", "validatePromo", "createPayment", "capturePayment"]),
  userId: z.string().uuid(),
  bookingId: z.string().uuid().optional(),
  returnUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  paypalOrderId: z.string().max(120).optional(),
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
    const admin = createServiceClient(requestId);

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
        const uploadDocument = async (file: UploadedDocument, label: "license" | "insurance") => {
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
          const result = await resolvePromo(String(promoCode), Number(booking.total_price) || 0);
          if ("error" in result) return json({ error: result.error, requestId }, 400);
          appliedPromo = result.promo;
          discountAmount = result.discount;
        }

        const insertPayload = {
          vehicle_id: booking.vehicle_id,
          rental_type: booking.rental_type,
          start_date: booking.start_date,
          end_date: booking.end_date || null,
          pickup_location: booking.pickup_location || null,
          total_price: Math.max(0, Number(booking.total_price) - discountAmount),
          down_payment_amount: booking.down_payment_amount || 0,
          security_deposit: booking.security_deposit || 0,
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

        if (bookingRow?.id && Array.isArray(addonPackageIds) && addonPackageIds.length) {
          const { data: pkgs, error: pkgErr } = await admin
            .from("themed_packages")
            .select("id, name, price")
            .in("id", addonPackageIds);

          if (pkgErr) {
            logError(requestId, "themed package lookup failed", pkgErr, { addonPackageIds });
          }

          const rows = (pkgs || []).map((p) => ({
            booking_id: bookingRow.id,
            package_id: p.id,
            package_name: p.name,
            price: p.price,
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
          return json({ error: "Could not start PayPal checkout", requestId }, 400);
        }

        await admin.from("rental_bookings").update({ paypal_order_id: orderJson.id }).eq("id", bk.id);

        const approve = (orderJson.links || []).find((l: any) => l.rel === "approve")?.href;
        return json({ data: { paypal_order_id: orderJson.id, approve_url: approve }, requestId });
      }
      case "capturePayment": {
        if (!bookingId || !paypalOrderId) return json({ error: "Missing payment reference", requestId }, 400);

        const { data: bk } = await admin
          .from("rental_bookings")
          .select("id, renter_user_id, status, paypal_order_id")
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
          })
          .eq("id", bk.id);

        return json({ data: { status: "paid", capture_id: capture?.id || null }, requestId });
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
