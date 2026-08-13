const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-dimes-auth-token, x-internal-secret",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

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
