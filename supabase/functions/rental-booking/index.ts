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
});

const RequestSchema = z.object({
  action: z.literal("createBooking"),
  userId: z.string().uuid(),
  booking: BookingPayloadSchema,
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

    const { action, userId, booking, documentFiles, addonPackageIds } = parsed.data;
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

    switch (action) {
      case "createBooking": {
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

        const insertPayload = {
          vehicle_id: booking.vehicle_id,
          rental_type: booking.rental_type,
          start_date: booking.start_date,
          end_date: booking.end_date || null,
          pickup_location: booking.pickup_location || null,
          total_price: booking.total_price,
          down_payment_amount: booking.down_payment_amount || 0,
          signature_text: booking.signature_text || null,
          signed_at: booking.signed_at || new Date().toISOString(),
          license_path: licensePath || null,
          insurance_path: insurancePath || null,
          renter_user_id: userId,
          referrer_username: directRef,
          upline_referrer_username: uplineRef,
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

        log(requestId, "booking created", { bookingId: bookingRow.id });
        return json({ data: bookingRow, requestId });
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
