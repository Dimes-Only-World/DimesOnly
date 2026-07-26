import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Returns the *public* OneSignal App ID so the browser SDK can initialise
// without needing a build-time VITE_ env var. The REST API key is never
// exposed here.
Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const appId = Deno.env.get("ONESIGNAL_APP_ID") ?? "";

  return new Response(JSON.stringify({ appId, configured: appId.length > 0 }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
