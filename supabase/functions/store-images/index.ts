import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { paths } = await req.json();
    if (!Array.isArray(paths) || paths.length === 0 || paths.length > 200) {
      return new Response(JSON.stringify({ error: "Invalid paths" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const clean = paths
      .filter((p: unknown): p is string => typeof p === "string" && p.length < 300)
      .filter((p) => !p.startsWith("/") && !p.startsWith("http"));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const urls: Record<string, string> = {};
    if (clean.length) {
      const { data } = await supabase.storage
        .from("product-images")
        .createSignedUrls(clean, 60 * 60);
      for (const row of data || []) {
        if (row.path && row.signedUrl) urls[row.path] = row.signedUrl;
      }
    }
    return new Response(JSON.stringify({ urls }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
