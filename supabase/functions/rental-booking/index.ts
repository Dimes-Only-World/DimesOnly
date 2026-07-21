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

const cleanExt = (fileName?: string) => {
  const raw = fileName?.split(".").pop()?.toLowerCase() || "bin";
  return raw.replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
};

const decodeBase64 = (value: string) => {
  const base64 = value.includes(",") ? value.split(",").pop() || "" : value;
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const { action, userId, ...params } = body;

    if (!userId) return json({ error: "userId required" }, 401);

    // Verify user exists in public.users (custom auth pattern)
    const { data: userRow, error: userErr } = await admin
      .from("users")
      .select("id, referred_by")
      .eq("id", userId)
      .maybeSingle();
    if (userErr || !userRow) return json({ error: "Invalid user" }, 401);

    switch (action) {
      case "createBooking": {
        const { booking, addonPackageIds, documentFiles } = params as {
          booking: Record<string, unknown>;
          addonPackageIds?: string[];
          documentFiles?: {
            license?: { name?: string; type?: string; base64: string };
            insurance?: { name?: string; type?: string; base64: string };
          };
        };

        const uploadDocument = async (
          file: { name?: string; type?: string; base64: string },
          label: "license" | "insurance",
        ) => {
          const path = `${userId}/${crypto.randomUUID()}-${label}.${cleanExt(file.name)}`;
          const { error } = await admin.storage
            .from("rental-documents")
            .upload(path, decodeBase64(file.base64), {
              contentType: file.type || "application/octet-stream",
              upsert: false,
            });
          if (error) throw error;
          return path;
        };

        const licensePath = documentFiles?.license
          ? await uploadDocument(documentFiles.license, "license")
          : booking.license_path;
        const insurancePath = documentFiles?.insurance
          ? await uploadDocument(documentFiles.insurance, "insurance")
          : booking.insurance_path;

        // Derive referral chain server-side (do not trust client)
        const directRef = (userRow as any).referred_by || null;
        let uplineRef: string | null = null;
        if (directRef) {
          const { data: refRow } = await admin
            .from("users")
            .select("referred_by")
            .ilike("username", directRef)
            .maybeSingle();
          uplineRef = (refRow as any)?.referred_by || null;
        }

        const insertPayload = {
          ...booking,
          license_path: licensePath,
          insurance_path: insurancePath,
          renter_user_id: userId, // force from verified user
          referrer_username: directRef,
          upline_referrer_username: uplineRef,
          status: "pending",
        };

        const { data: bookingRow, error: insErr } = await admin
          .from("rental_bookings")
          .insert(insertPayload)
          .select()
          .single();
        if (insErr) throw insErr;

        if (bookingRow?.id && addonPackageIds?.length) {
          const { data: pkgs } = await admin
            .from("themed_packages")
            .select("id, name, price")
            .in("id", addonPackageIds);
          const rows = (pkgs || []).map((p: any) => ({
            booking_id: bookingRow.id,
            package_id: p.id,
            package_name: p.name,
            price: p.price,
          }));
          if (rows.length) await admin.from("booking_addons").insert(rows);
        }

        return json({ data: bookingRow });
      }
      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (e: any) {
    return json({ error: e?.message || "Server error" }, 500);
  }
});
