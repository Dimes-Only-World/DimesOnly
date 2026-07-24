import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_TIERS = new Set(["free", "silver", "gold"]);
const ALLOWED_MEDIA = new Set(["photo", "video"]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const userId = form.get("user_id")?.toString() ?? "";
    const contentTier = (form.get("content_tier")?.toString() ?? "free").toLowerCase();
    const mediaType = (form.get("media_type")?.toString() ?? "photo").toLowerCase();

    if (!file || !userId) {
      return json({ error: "file and user_id are required" }, 400);
    }
    if (!ALLOWED_TIERS.has(contentTier)) {
      return json({ error: "invalid content_tier" }, 400);
    }
    if (!ALLOWED_MEDIA.has(mediaType)) {
      return json({ error: "invalid media_type" }, 400);
    }

    const isPhoto = mediaType === "photo";
    const maxBytes = (isPhoto ? 20 : 250) * 1024 * 1024;
    if (file.size > maxBytes) {
      return json({ error: `File too large. Max ${isPhoto ? "20MB" : "250MB"}.` }, 400);
    }
    if (isPhoto && !file.type.startsWith("image/")) {
      return json({ error: "Photo uploads must be image files" }, 400);
    }
    if (!isPhoto && !file.type.startsWith("video/")) {
      return json({ error: "Video uploads must be video files" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Validate user exists (and fetch username for filename readability)
    const { data: user, error: userErr } = await admin
      .from("users")
      .select("id, username")
      .eq("id", userId)
      .maybeSingle();
    if (userErr || !user) {
      return json({ error: "user not found" }, 404);
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
    const ext = safeName.includes(".") ? safeName.split(".").pop() : (isPhoto ? "jpg" : "mp4");
    const timestamp = Date.now();
    // First folder MUST be user_id so storage RLS folder check passes for future authenticated reads
    const storagePath = `${userId}/${contentTier}/${isPhoto ? "photos" : "videos"}/${timestamp}_${safeName}`;

    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: upErr } = await admin.storage
      .from("private-media")
      .upload(storagePath, bytes, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (upErr) {
      console.error("storage upload failed", upErr);
      return json({ error: `Storage upload failed: ${upErr.message}` }, 500);
    }

    const { data: pub } = admin.storage.from("private-media").getPublicUrl(storagePath);
    const publicUrl = pub?.publicUrl ?? "";

    const { data: row, error: dbErr } = await admin
      .from("user_media")
      .insert({
        user_id: userId,
        media_url: publicUrl,
        media_type: mediaType,
        filename: safeName,
        file_size: file.size,
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
      // best-effort cleanup
      await admin.storage.from("private-media").remove([storagePath]);
      console.error("db insert failed", dbErr);
      return json({ error: `Database insert failed: ${dbErr.message}` }, 500);
    }

    return json({ success: true, media: row, storage_path: storagePath, url: publicUrl });
  } catch (e) {
    console.error("media-upload error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
