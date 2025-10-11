import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const username = formData.get("username")?.toString();
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

    const ext = file.name.split(".").pop() ?? "jpg";
    const timestamp = Date.now();
    const storagePath = `profiles/${username}_${photoType}_${timestamp}.${ext}`;

    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("user-photos")
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

    const { data: urlData } = supabase.storage.from("user-photos").getPublicUrl(storagePath);
    const url = urlData?.publicUrl ?? "";

    const columnMap: Record<string, string> = {
      profile: "profile_photo",
      banner: "banner_photo",
      frontPage: "front_page_photo",
    };
    const column = columnMap[photoType] ?? "profile_photo";

    const { error: updateError } = await supabase
      .from("users")
      .update({ [column]: url })
      .eq("username", username);

    if (updateError) {
      console.log("Skipping user record update:", updateError.message);
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
    return new Response(JSON.stringify({ error: `Internal server error: ${error.message}` }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});