import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Signs short-lived URLs for rental photos: vehicle listing media and
// moderator-approved guest captures. Only paths that exist in the matching
// table (and are approved, for captures) are signed.
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { bucket, paths } = await req.json();
    if (!["vehicle-media", "rental-captures"].includes(bucket)) return json({ error: "invalid bucket" }, 400);
    if (!Array.isArray(paths) || paths.length === 0 || paths.length > 200) return json({ error: "invalid paths" }, 400);
    const clean = [...new Set(paths.filter((p: unknown): p is string =>
      typeof p === "string" && p.length < 300 && !p.includes("..") && !p.startsWith("/")))];
    if (!clean.length) return json({ urls: {} });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let allowed: string[] = [];
    if (bucket === "vehicle-media") {
      const { data } = await admin.from("vehicle_media").select("storage_path").in("storage_path", clean);
      allowed = (data || []).map((r: any) => r.storage_path);
    } else {
      const { data } = await admin.from("rental_captures").select("storage_path")
        .in("storage_path", clean).eq("moderation_status", "approved");
      allowed = (data || []).map((r: any) => r.storage_path);
    }

    const urls: Record<string, string> = {};
    if (allowed.length) {
      const { data } = await admin.storage.from(bucket).createSignedUrls(allowed, 3600);
      for (const s of data || []) if (s.path && s.signedUrl) urls[s.path] = s.signedUrl;
    }
    return json({ urls });
  } catch {
    return json({ error: "Could not load media" }, 400);
  }
});
