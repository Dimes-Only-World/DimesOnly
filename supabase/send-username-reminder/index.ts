import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing RESEND_API_KEY" }),
        { status: 500, headers: corsHeaders },
      );
    }

    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Your DimesOnly username",
      html: `<p>Your username is <strong>${data.username}</strong>.</p>`,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ success: false, message: "Server error" }),
      { status: 500, headers: corsHeaders },
    );
  }
});