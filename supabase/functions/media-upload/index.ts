import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_TIERS = new Set(["free", "silver", "gold"]);
const ALLOWED_MEDIA = new Set(["photo", "video"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ error: "JSON body required" }, 400);
    }

    const action = String((body as any).action ?? "sign").toLowerCase();
    const userId = String((body as any).user_id ?? "");
    const contentTier = String((body as any).content_tier ?? "free").toLowerCase();
    const mediaType = String((body as any).media_type ?? "photo").toLowerCase();

    if (!userId) return json({ error: "user_id is required" }, 400);
    if (!ALLOWED_TIERS.has(contentTier)) return json({ error: "invalid content_tier" }, 400);
    if (!ALLOWED_MEDIA.has(mediaType)) return json({ error: "invalid media_type" }, 400);

    const isPhoto = mediaType === "photo";

    const { data: user, error: userErr } = await admin
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (userErr || !user) return json({ error: "user not found" }, 404);

    if (action === "sign") {
      const rawName = String((body as any).filename ?? (isPhoto ? "photo.jpg" : "video.mp4"));
      const fileSize = Number((body as any).file_size ?? 0);
      const maxBytes = (isPhoto ? 20 : 500) * 1024 * 1024;
      if (fileSize > maxBytes) {
        return json({ error: `File too large. Max ${isPhoto ? "20MB" : "500MB"}.` }, 400);
      }

      const safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
      const storagePath = `${userId}/${contentTier}/${isPhoto ? "photos" : "videos"}/${Date.now()}_${safeName}`;

      const { data: signed, error: signErr } = await admin.storage
        .from("private-media")
        .createSignedUploadUrl(storagePath);

      if (signErr || !signed) {
        console.error("sign failed", signErr);
        return json({ error: `Could not start upload: ${signErr?.message ?? "unknown"}` }, 500);
      }

      return json({
        success: true,
        storage_path: storagePath,
        token: signed.token,
        signed_url: signed.signedUrl,
        filename: safeName,
      });
    }

    if (action === "record") {
      const storagePath = String((body as any).storage_path ?? "");
      const filename = String((body as any).filename ?? "");
      const fileSize = Number((body as any).file_size ?? 0);
      if (!storagePath.startsWith(`${userId}/`)) {
        return json({ error: "invalid storage_path" }, 400);
      }

      const { data: pub } = admin.storage.from("private-media").getPublicUrl(storagePath);
      const publicUrl = pub?.publicUrl ?? "";

      const { data: row, error: dbErr } = await admin
        .from("user_media")
        .insert({
          user_id: userId,
          media_url: publicUrl,
          media_type: mediaType,
          filename,
          file_size: fileSize,
          storage_path: storagePath,
          content_tier: contentTier,
          is_nude: contentTier === "silver",
          is_xrated: contentTier === "gold",
          upload_date: new Date().toISOString(),
          access_restricted: contentTier !== "free",
        })
        .select()
        .single();

      if (dbErr) {
        await admin.storage.from("private-media").remove([storagePath]);
        console.error("db insert failed", dbErr);
        return json({ error: `Database insert failed: ${dbErr.message}` }, 500);
      }

      return json({ success: true, media: row, storage_path: storagePath, url: publicUrl });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    console.error("media-upload error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
