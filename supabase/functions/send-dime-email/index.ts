// send-dime-email — internal endpoint fired by database triggers (pg_net) when
// a rating is submitted or someone joins an event. Authenticated with a shared
// secret stored in public.email_hook_config (service-role only).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders as sdkCors } from "npm:@supabase/supabase-js@2/cors";
const corsHeaders = { ...sdkCors, "Access-Control-Allow-Headers": `${sdkCors["Access-Control-Allow-Headers"]}, x-user-token, x-admin-token` };
import { EMAIL_BRAND, sendDimesEmail } from "../_shared/dimes-emails.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function formatEventDetails(event: Record<string, unknown>): string {
  const name = String(event.name ?? "an upcoming event");
  let when = "";
  if (event.date_tba) {
    when = "date to be announced";
  } else if (event.date) {
    const d = new Date(`${event.date}T00:00:00Z`);
    when = d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });
  }
  const city = event.city ? String(event.city) : "";
  const state = event.state ? String(event.state) : "";
  const where = [city, state].filter(Boolean).join(", ");
  return [name, when && `on ${when}`, where && `in ${where}`]
    .filter(Boolean)
    .join(" ");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Shared-secret auth: triggers send the secret from email_hook_config.
  const { data: secretRow } = await supabase
    .from("email_hook_config")
    .select("value")
    .eq("key", "secret")
    .maybeSingle();
  const provided = req.headers.get("x-internal-secret") || "";
  if (!secretRow?.value || provided !== secretRow.value) {
    return json({ error: "unauthorized" }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const type = payload.type;

  try {
    if (type === "rated") {
      const ratingId = String(payload.rating_id || "");
      if (!ratingId) return json({ error: "rating_id required" }, 400);

      const { data: rating } = await supabase
        .from("ratings")
        .select("id, user_id, rating, created_at")
        .eq("id", ratingId)
        .maybeSingle();
      if (!rating) return json({ error: "rating_not_found" }, 404);

      // Replay guard: only email for freshly created ratings (15 min window).
      const ageMs = Date.now() - new Date(rating.created_at).getTime();
      if (ageMs > 15 * 60 * 1000) return json({ skipped: "stale" });

      const { data: dime } = await supabase
        .from("users")
        .select("email, username, first_name, is_active")
        .eq("id", rating.user_id)
        .maybeSingle();
      if (!dime?.email || dime.is_active === false) {
        return json({ skipped: "no_recipient" });
      }

      const result = await sendDimesEmail(
        { email: dime.email, name: dime.first_name || dime.username },
        "rated",
        {
          dime_name: dime.first_name || dime.username,
          rating: String(rating.rating),
          button_url: `${EMAIL_BRAND.siteUrl}/dashboard/referrals`,
        },
      );
      return json({ ok: result.ok, error: result.error });
    }

    if (type === "event_join") {
      const userEventId = String(payload.user_event_id || "");
      if (!userEventId) return json({ error: "user_event_id required" }, 400);

      const { data: userEvent } = await supabase
        .from("user_events")
        .select("id, user_id, event_id, created_at")
        .eq("id", userEventId)
        .maybeSingle();
      if (!userEvent) return json({ error: "user_event_not_found" }, 404);

      const ageMs = Date.now() - new Date(userEvent.created_at).getTime();
      if (ageMs > 15 * 60 * 1000) return json({ skipped: "stale" });

      const [{ data: event }, { data: joiner }] = await Promise.all([
        supabase
          .from("events")
          .select("name, date, end_date, date_tba, city, state")
          .eq("id", userEvent.event_id)
          .maybeSingle(),
        supabase
          .from("users")
          .select("username, profile_photo")
          .eq("id", userEvent.user_id)
          .maybeSingle(),
      ]);
      if (!event || !joiner) return json({ skipped: "missing_context" });

      // Dimes (exotic / stripper performers) already registered for this event.
      const { data: attendees } = await supabase
        .from("user_events")
        .select("user_id")
        .eq("event_id", userEvent.event_id)
        .neq("user_id", userEvent.user_id)
        .limit(500);

      const attendeeIds = [...new Set((attendees || []).map((a) => a.user_id))];
      if (attendeeIds.length === 0) return json({ sent: 0 });

      const { data: dimes } = await supabase
        .from("users")
        .select("id, email, username, first_name")
        .in("id", attendeeIds)
        .in("user_type", ["exotic", "stripper"])
        .eq("is_active", true)
        .not("email", "is", null)
        .limit(20);

      const eventDetails = formatEventDetails(event);
      let sent = 0;
      for (const dime of dimes || []) {
        if (!dime.email) continue;
        const result = await sendDimesEmail(
          { email: dime.email, name: dime.first_name || dime.username },
          "event",
          {
            dime_name: dime.first_name || dime.username,
            username: joiner.username || "A member",
            profile_photo: joiner.profile_photo || "",
            event_details: eventDetails,
            button_url: `${EMAIL_BRAND.siteUrl}/dashboard/messages`,
          },
        );
        if (result.ok) sent++;
      }
      return json({ sent });
    }

    return json({ error: "unknown_type" }, 400);
  } catch (err) {
    console.error("send-dime-email error", err);
    return json({ error: "internal_error" }, 500);
  }
});
