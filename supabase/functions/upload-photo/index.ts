import { getCallerId, AUTH_HEADERS } from "../_shared/caller.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyPhotoOwner } from "./authorization.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": AUTH_HEADERS,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const username = formData.get("username")?.toString().trim().toLowerCase();
    const photoType = formData.get("photoType")?.toString() ?? "profile";

    if (!file || !username) {
      return new Response(JSON.stringify({ error: "File and username are required." }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed." }),
        { status: 400, headers: corsHeaders },
      );
    }

    const MAX_SIZE_MB = 10;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: `File size too large. Maximum size is ${MAX_SIZE_MB}MB.` }),
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

    const columnMap: Record<string, string> = {
      profile: "profile_photo",
      banner: "banner_photo",
      frontPage: "front_page_photo",
    };
    const column = columnMap[photoType];
    if (!column || username.includes("/") || username.includes("\\")) {
      return new Response(JSON.stringify({ error: "Invalid photo type or username." }), { status: 400, headers: corsHeaders });
    }
    const { data: owner, error: ownerError } = await supabase.from("users")
      .select("id").ilike("username", username.replace(/[\\%_]/g, "\\$&")).maybeSingle();
    if (ownerError) {
      return new Response(JSON.stringify({ error: "Could not verify this profile. Please try again." }), { status: 500, headers: corsHeaders });
    }
    // Authorize before writing any file. Signup photos for unused names remain supported.
    if (!(await verifyPhotoOwner(owner?.id ?? null, () => getCallerId(req)))) {
      return new Response(JSON.stringify({ error: "Please sign in again to change this photo." }), { status: 403, headers: corsHeaders });
    }
    const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp" };
    const ext = extensions[file.type] || "jpg";
    const storagePath = `profiles/${username}/${photoType}_${crypto.randomUUID()}.${ext}`;

    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("user-photos")
      .upload(storagePath, bytes, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ error: `Upload failed: ${uploadError.message}` }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const { data: urlData } = supabase.storage.from("user-photos").getPublicUrl(storagePath);
    const url = urlData?.publicUrl ?? "";

    if (owner) {
      const { data: saved, error: updateError } = await supabase.from("users")
        .update({ [column]: url }).eq("id", owner.id).select("id").single();
      if (updateError || !saved) {
        await supabase.storage.from("user-photos").remove([storagePath]);
        return new Response(JSON.stringify({ error: "Could not save your photo. Please try again." }), { status: 500, headers: corsHeaders });
      }
    }

    // Registration photos also become entry-level ("silver") feed content.
    try {
      const { data: userRow } = await supabase
        .from("users")
        .select("id")
        .eq("username", username)
        .maybeSingle();

      if (userRow?.id && url) {
        const { data: existing } = await supabase
          .from("user_media")
          .select("id")
          .eq("user_id", userRow.id)
          .eq("media_url", url)
          .maybeSingle();

        if (!existing) {
          const { error: mediaError } = await supabase.from("user_media").insert({
            user_id: userRow.id,
            media_url: url,
            media_type: "photo",
            filename: file.name,
            file_size: file.size,
            storage_path: storagePath,
            content_tier: "free",
          });
          if (mediaError) console.log("Skipping user_media insert:", mediaError.message);
        }
      }
    } catch (mediaErr) {
      console.log("user_media insert skipped:", mediaErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        url,
        storagePath,
        photoType,
        message: "Photo uploaded successfully.",
      }),
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});