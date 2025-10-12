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
        html: `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Your DimesOnly Username</title>
    </head>
    <body style="background:#fdf2f8;margin:0;padding:0;font-family:'Arial',sans-serif;color:#1f2937;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td align="center" style="padding:32px 16px;">
            <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;box-shadow:0 12px 30px rgba(244,114,182,0.25);overflow:hidden;">
              <tr>
                <td style="background:linear-gradient(135deg,#ec4899 0%,#8b5cf6 100%);padding:28px 32px;text-align:center;color:#fdf2f8;">
                  <h1 style="margin:0;font-size:26px;letter-spacing:1px;">DimesOnly</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:32px;">
                  <h2 style="margin-top:0;font-size:22px;color:#be185d;">Here’s Your Username</h2>
                  <p style="margin:16px 0;font-size:16px;line-height:1.6;">
                    You requested a reminder for your DimesOnly username. Keep it handy for your next login.
                  </p>
                  <div style="margin:28px 0;padding:20px;border-radius:12px;background:#fdf2f8;border:1px solid rgba(244,114,182,0.35);text-align:center;">
                    <span style="display:inline-block;font-size:20px;font-weight:700;color:#be185d;letter-spacing:0.5px;">
                      ${data.username}
                    </span>
                  </div>
                  <p style="margin:16px 0;font-size:14px;color:#6b7280;line-height:1.6;">
                    For security, this reminder was sent because someone entered your email on the username recovery form.
                    If that wasn’t you, no action is required.
                  </p>
                  <p style="margin:16px 0;font-size:14px;color:#6b7280;">
                    Need more help? Reply to this message and our support team will assist you.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background:#f9fafb;padding:20px;text-align:center;font-size:12px;color:#9ca3af;">
                  © 2025 DimesOnly. All rights reserved.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
`
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