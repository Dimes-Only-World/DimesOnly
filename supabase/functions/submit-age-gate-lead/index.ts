import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const isIsoDate = (v: unknown): v is string =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

const ageFrom = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  const today = new Date();
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age -= 1;
  return age;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return json({ error: "Server configuration missing" }, 500);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ error: "Invalid request body" }, 400);
    }

    const { leadId, action, lookup } = body as { leadId?: string; action?: string; lookup?: boolean };

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Lookup call: verify a returning visitor already submitted the short form.
    if (lookup) {
      const name = String((body as any).fullName ?? "").trim();
      const rawPhone = String((body as any).phone ?? "").trim();
      const digits = rawPhone.replace(/\D/g, "");

      if (name.length < 2 || digits.length < 7) {
        return json({ error: "Enter your name and phone number to continue" }, 400);
      }

      const { data, error } = await admin
        .from("age_gate_leads")
        .select("id, full_name, phone")
        .ilike("full_name", name)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const match = (data ?? []).find(
        (row: { phone: string | null }) => (row.phone ?? "").replace(/\D/g, "") === digits,
      );

      if (!match) return json({ found: false }, 200);
      return json({ found: true, leadId: match.id }, 200);
    }

    // Second call: record which button the visitor pressed after the video.
    if (leadId) {
      if (!/^[0-9a-f-]{36}$/i.test(leadId)) return json({ error: "Invalid lead id" }, 400);
      const allowed = ["continued_registration", "more_information"];
      if (!allowed.includes(String(action))) return json({ error: "Invalid action" }, 400);

      const { error } = await admin
        .from("age_gate_leads")
        .update({ action_taken: action })
        .eq("id", leadId);
      if (error) throw error;
      return json({ success: true });
    }

    // First call: create the lead.
    const fullName = String((body as any).fullName ?? "").trim();
    const phone = String((body as any).phone ?? "").trim();
    const dateOfBirth = (body as any).dateOfBirth;
    const referralCode = (body as any).referralCode
      ? String((body as any).referralCode).trim().slice(0, 100)
      : null;

    const errors: Record<string, string> = {};
    if (fullName.length < 2 || fullName.length > 100) errors.fullName = "Name must be 2-100 characters";
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) errors.phone = "Enter a valid phone number";
    if (!isIsoDate(dateOfBirth)) errors.dateOfBirth = "Date of birth is required";
    else if (ageFrom(dateOfBirth) < 18) errors.dateOfBirth = "You must be at least 18 years old";

    if (Object.keys(errors).length > 0) return json({ error: errors }, 400);

    const { data, error } = await admin
      .from("age_gate_leads")
      .insert({
        full_name: fullName,
        phone,
        date_of_birth: dateOfBirth,
        referral_code: referralCode,
        action_taken: "submitted",
      })
      .select("id")
      .single();

    if (error) throw error;

    return json({ success: true, leadId: data.id });
  } catch (err) {
    console.error("submit-age-gate-lead error:", err);
    return json({ error: "Failed to save submission" }, 500);
  }
});
