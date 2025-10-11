import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const slotTier = {
  video1: { tier: "free", isNude: false, isXrated: false },
  video2: { tier: "silver", isNude: true, isXrated: false },
  video3: { tier: "gold", isNude: false, isXrated: true },
} as const;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const username = formData.get("username")?.toString();
    const slot = formData.get("photoType")?.toString() ?? "video1";

    if (!file || !username) {
      return new Response(JSON.stringify({ error: "File and username are required." }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const meta = slotTier[slot as keyof typeof slotTier] ?? slotTier.video1;

    const allowedVideoTypes = [
      "video/mp4",
      "video/quicktime",
      "video/webm",
      "video/ogg",
      "video/x-msvideo",
      "video/x-matroska",
    ];
    if (!allowedVideoTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: "Invalid file type. Allowed: MP4, MOV, WEBM, OGG, AVI, MKV." }),
        { status: 400, headers: corsHeaders },
      );
    }

    const MAX_SIZE_MB = 200;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: `File too large. Maximum allowed is ${MAX_SIZE_MB}MB.` }),
        { status: 400, headers: corsHeaders },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Supabase credentials missing." }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const ext = file.name.split(".").pop() ?? "mp4";
    const timestamp = Date.now();
    const storagePath = `${username}/${meta.tier}/videos/${slot}_${timestamp}.${ext}`;

    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("private-media")
      .upload(storagePath, bytes, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ error: `Upload failed: ${uploadError.message}` }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const { data: urlData } = supabase.storage.from("private-media").getPublicUrl(storagePath);
    const url = urlData?.publicUrl ?? "";

    const { data: existing, error: fetchError } = await supabase
      .from("users")
      .select("video_urls")
      .eq("username", username)
      .single();

    if (fetchError) {
      console.error("Failed to fetch current video URLs:", fetchError);
    } else {
      const nextUrls = Array.isArray(existing?.video_urls)
        ? [...existing.video_urls.filter(Boolean), url]
        : [url];

      const { error: updateError } = await supabase
        .from("users")
        .update({ video_urls: nextUrls })
        .eq("username", username);

      if (updateError) {
        console.error("Failed to update video URLs:", updateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        url,
        storagePath,
        slot,
        contentTier: meta.tier,
        isNude: meta.isNude,
        isXrated: meta.isXrated,
        message: "Video uploaded successfully.",
      }),
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: `Internal server error: ${error.message}` }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});