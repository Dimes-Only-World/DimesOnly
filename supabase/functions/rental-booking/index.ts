import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type UploadedDocument = { name?: string; type?: string; base64: string };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const log = (requestId: string, message: string, details?: Record<string, unknown>) => {
  console.log(`[rental-booking:${requestId}] ${message}`, details ?? {});
};

const logError = (requestId: string, message: string, error: unknown) => {
  console.error(`[rental-booking:${requestId}] ${message}`, error);
};

const cleanExt = (fileName?: string) => {
  const raw = fileName?.split(".").pop()?.toLowerCase() || "bin";
  return raw.replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
};

const decodeBase64 = (value: string) => {
  const base64 = value.includes(",") ? value.split(",").pop() || "" : value;
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
};

const createServiceClient = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  // This is the correct server-side service-role client. Do not use the caller's
  // Authorization header here; every PostgREST request must carry the service key.
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
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
    const admin = createServiceClient();
    const body = await req.json();
    const { action, userId, ...params } = body ?? {};

    log(requestId, "request received", {
      action,
      hasUserId: Boolean(userId),
      hasAuthorizationHeader: Boolean(req.headers.get("authorization")),
      hasApiKeyHeader: Boolean(req.headers.get("apikey")),
    });

    if (!userId || typeof userId !== "string") {
      return json({ error: "userId required", requestId }, 401);
    }

    const { data: userRow, error: userErr } = await admin
      .from("users")
      .select("id, username, referred_by")
      .eq("id", userId)
      .maybeSingle();

    if (userErr) {
      logError(requestId, "user verification query failed", userErr);
      return json({ error: "Could not verify user", requestId }, 500);
    }

    if (!userRow) {
      log(requestId, "invalid user id", { userId });
      return json({ error: "Invalid user", requestId }, 401);
    }

    switch (action) {
      case "createBooking": {
        const { booking, addonPackageIds, documentFiles } = params as {
          booking?: Record<string, unknown>;
          addonPackageIds?: string[];
          documentFiles?: {
            license?: UploadedDocument;
            insurance?: UploadedDocument;
          };
        };

        if (!booking || typeof booking !== "object") {
          return json({ error: "booking required", requestId }, 400);
        }

        const requiredFields = ["vehicle_id", "rental_type", "start_date", "total_price"];
        const missingFields = requiredFields.filter((field) => !booking[field]);
        if (missingFields.length) {
          return json({ error: `Missing booking fields: ${missingFields.join(", ")}`, requestId }, 400);
        }

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
            logError(requestId, `document upload failed (${label})`, error);
            throw new Error(`Document upload failed: ${error.message}`);
          }

          return path;
        };

        const licensePath = documentFiles?.license
          ? await uploadDocument(documentFiles.license, "license")
          : booking.license_path;
        const insurancePath = documentFiles?.insurance
          ? await uploadDocument(documentFiles.insurance, "insurance")
          : booking.insurance_path;

        // Derive referral chain server-side. Never trust client-supplied referral fields.
        const directRef = userRow.referred_by || null;
        let uplineRef: string | null = null;

        if (directRef) {
          const { data: refRow, error: refErr } = await admin
            .from("users")
            .select("referred_by")
            .ilike("username", directRef)
            .maybeSingle();

          if (refErr) logError(requestId, "upline referral lookup failed", refErr);
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
          vehicle_id: insertPayload.vehicle_id,
          renter_user_id: insertPayload.renter_user_id,
          rental_type: insertPayload.rental_type,
          hasLicensePath: Boolean(insertPayload.license_path),
          hasInsurancePath: Boolean(insertPayload.insurance_path),
          addonCount: Array.isArray(addonPackageIds) ? addonPackageIds.length : 0,
        });

        const { data: bookingRow, error: insErr } = await admin
          .from("rental_bookings")
          .insert(insertPayload)
          .select("*")
          .single();

        if (insErr) {
          logError(requestId, "rental_bookings insert failed", insErr);
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
            logError(requestId, "themed package lookup failed", pkgErr);
          }

          const rows = (pkgs || []).map((p) => ({
            booking_id: bookingRow.id,
            package_id: p.id,
            package_name: p.name,
            price: p.price,
          }));

          if (rows.length) {
            const { error: addonErr } = await admin.from("booking_addons").insert(rows);
            if (addonErr) logError(requestId, "booking_addons insert failed", addonErr);
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
