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
    const { email } = await req.json();
    if (!email) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing email" }),
        { status: 400, headers: corsHeaders },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data, error } = await supabase
      .from("users")
      .select("username")
      .eq("email", email)
      .maybeSingle();

    if (error || !data) {
      return new Response(
        JSON.stringify({ success: false, message: "Email not found" }),
        { status: 404, headers: corsHeaders },
      );
    }

    const mailtrapToken = Deno.env.get("MAILTRAP_API_TOKEN");
    const senderEmail = Deno.env.get("MAILTRAP_SENDER_EMAIL");
    const senderName = Deno.env.get("MAILTRAP_SENDER_NAME") ?? "DimesOnly Support";

    if (!mailtrapToken || !senderEmail) {
      return new Response(
        JSON.stringify({ success: false, message: "Mailtrap configuration missing" }),
        { status: 500, headers: corsHeaders },
      );
    }

    const mailtrapResponse = await fetch("https://send.api.mailtrap.io/api/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mailtrapToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: { email: senderEmail, name: senderName },
        to: [{ email }],
        subject: "Your DimesOnly username",
        text: `Your DimesOnly username is ${data.username}.`,
        html: `<p>Your DimesOnly username is <strong>${data.username}</strong>.</p>`,
      }),
    });

    if (!mailtrapResponse.ok) {
      const details = await mailtrapResponse.text();
      console.error("Mailtrap error:", mailtrapResponse.status, details);
      return new Response(
        JSON.stringify({ success: false, message: "Failed to send email" }),
        { status: 502, headers: corsHeaders },
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("send-username-reminder error:", err);
    return new Response(
      JSON.stringify({ success: false, message: "Server error" }),
      { status: 500, headers: corsHeaders },
    );
  }
});