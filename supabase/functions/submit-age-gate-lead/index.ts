import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders as sdkCors } from "npm:@supabase/supabase-js@2/cors";
const corsHeaders = { ...sdkCors, "Access-Control-Allow-Headers": `${sdkCors["Access-Control-Allow-Headers"]}, x-user-token, x-admin-token` };

const isIsoDate = (v: unknown): v is string =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

const ageFrom = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  const today = new Date();
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age -= 1;
  return age;
};

type FaceResult = { status: "ok" | "rejected" | "unavailable"; reason?: string };

async function verifyFace(base64: string, mime: string): Promise<FaceResult> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return { status: "unavailable" };
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
        input: [{
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                'This is an age-verification selfie upload. Decide if it is a real photo of exactly one live human person with their face clearly visible (a selfie or face photo). Reject: no face, objects, animals, landscapes, cartoons/drawings/AI art, memes, screenshots, photos of screens or of printed photos, face fully covered or too blurry/dark to see. Reply ONLY with JSON: {"face": true|false, "reason": "short friendly message to the user if false"}',
            },
            { type: "input_image", image_url: `data:${mime};base64,${base64}` },
          ],
        }],
      }),
    });
    if (!res.ok || !res.body) {
      console.error("face check gateway status", res.status, await res.text().catch(() => ""));
      return { status: "unavailable" };
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const evt = JSON.parse(data);
          if (evt.type === "response.output_text.delta") text += evt.delta ?? "";
          if (evt.type === "error" || evt.type === "response.failed") {
            console.error("face check stream error", data);
            return { status: "unavailable" };
          }
        } catch { /* ignore partial */ }
      }
    }
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error("face check empty/unparsable output", text);
      return { status: "unavailable" };
    }
    const parsed = JSON.parse(match[0]);
    if (parsed.face === true) return { status: "ok" };
    return { status: "rejected", reason: String(parsed.reason ?? "").slice(0, 200) };
  } catch (e) {
    console.error("face check failed", e);
    return { status: "unavailable" };
  }
}

type Control = {
  enabled: boolean; monthly_credit_limit: number; credits_per_check: number; period_month: string;
  checks_this_month: number; credits_this_month: number; skipped_this_month: number; alerts_reached: number[];
};
const currentMonth = () => new Date().toISOString().slice(0, 7);

async function loadControl(admin: any): Promise<Control | null> {
  const { data, error } = await admin.from("ai_selfie_check_control").select("*").eq("id", 1).maybeSingle();
  if (error || !data) { console.error("selfie control load failed", error); return null; }
  const c = data as Control;
  if (c.period_month !== currentMonth()) {
    // New month: reset the counters. A pause stays until an admin turns AI checks back on.
    const reset = { period_month: currentMonth(), checks_this_month: 0, credits_this_month: 0, skipped_this_month: 0, alerts_reached: [] as number[], updated_at: new Date().toISOString() };
    await admin.from("ai_selfie_check_control").update(reset).eq("id", 1);
    Object.assign(c, reset);
  }
  return c;
}

async function recordCheck(admin: any, c: Control) {
  const credits = Number(c.credits_this_month) + Number(c.credits_per_check);
  const limit = Number(c.monthly_credit_limit);
  const pct = limit > 0 ? (credits / limit) * 100 : 100;
  const alerts = [...(c.alerts_reached ?? [])];
  for (const t of [50, 80, 100]) if (pct >= t && !alerts.includes(t)) alerts.push(t);
  const update: Record<string, unknown> = {
    checks_this_month: c.checks_this_month + 1, credits_this_month: credits, alerts_reached: alerts, updated_at: new Date().toISOString(),
  };
  if (credits >= limit) { update.enabled = false; update.paused_at = new Date().toISOString(); }
  await admin.from("ai_selfie_check_control").update(update).eq("id", 1);
}

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
        .select("id, full_name, phone, selfie_path")
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

    // Check call: does this phone/DOB already belong to a profile or a prior lead?
    if ((body as any).check) {
      const rawPhone = String((body as any).phone ?? "").trim();
      const digits = rawPhone.replace(/\D/g, "").slice(-10);
      const dob = (body as any).dateOfBirth;
      if (digits.length !== 10) return json({ error: "Enter a valid phone number" }, 400);

      const { data: users, error: uErr } = await admin
        .from("users")
        .select("username, profile_photo, front_page_photo, banner_photo, phone_number, mobile_number, date_of_birth")
        .limit(5000);
      if (uErr) throw uErr;

      const norm = (v: unknown) => String(v ?? "").replace(/\D/g, "").slice(-10);
      const profiles = (users ?? [])
        // Only reveal a profile when BOTH phone and date of birth match.
        .filter((u: any) =>
          (norm(u.phone_number) === digits || norm(u.mobile_number) === digits) &&
          isIsoDate(dob) && String(u.date_of_birth ?? "").slice(0, 10) === dob)
        .map((u: any) => ({
          username: u.username,
          photo: u.profile_photo || u.front_page_photo || u.banner_photo || null,
          dob_match: true,
        }));

      const { data: leads } = await admin
        .from("age_gate_leads")
        .select("id, phone, date_of_birth, selfie_path")
        .order("created_at", { ascending: false })
        .limit(2000);

      const lead = (leads ?? []).find(
        (l: any) =>
          String(l.phone ?? "").replace(/\D/g, "").slice(-10) === digits &&
          isIsoDate(dob) &&
          String(l.date_of_birth ?? "").slice(0, 10) === dob,
      );

      return json({
        profiles,
        alreadySubmitted: Boolean(lead),
        leadId: lead?.id ?? null,
      });
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
    const usernameRaw = String((body as any).username ?? "").trim().toLowerCase();
    const fullName = usernameRaw || String((body as any).fullName ?? "").trim();
    const phone = String((body as any).phone ?? "").trim();
    const dateOfBirth = (body as any).dateOfBirth;
    const referralCode = (body as any).referralCode
      ? String((body as any).referralCode).trim().slice(0, 100)
      : null;
    const selfieBase64 = String((body as any).selfieBase64 ?? "");
    const selfieContentType = String((body as any).selfieContentType ?? "").toLowerCase();

    const errors: Record<string, string> = {};
    if (fullName.length < 2 || fullName.length > 100) errors.fullName = "Name must be 2-100 characters";
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) errors.phone = "Enter a valid phone number";
    if (!isIsoDate(dateOfBirth)) errors.dateOfBirth = "Date of birth is required";
    else if (ageFrom(dateOfBirth) < 18) errors.dateOfBirth = "You must be at least 18 years old";
    if (!selfieBase64) errors.selfie = "A selfie is required";
    if (!/^image\/(jpeg|png|webp)$/.test(selfieContentType)) errors.selfie = "Use a JPG, PNG, or WebP image";

    if (Object.keys(errors).length > 0) return json({ error: errors }, 400);

    let selfieBytes: Uint8Array;
    try {
      selfieBytes = Uint8Array.from(atob(selfieBase64), (character) => character.charCodeAt(0));
    } catch {
      return json({ error: { selfie: "The selfie could not be read" } }, 400);
    }
    if (selfieBytes.length === 0 || selfieBytes.length > 5 * 1024 * 1024) {
      return json({ error: { selfie: "The selfie must be smaller than 5MB" } }, 400);
    }

    // AI check: the photo must show one real person's face (not objects, screenshots, cartoons).
    // Uses the small preview the browser made (cheaper), falling back to the full selfie.
    const preview = String((body as any).aiPreviewBase64 ?? "");
    const usePreview = preview.length > 0 && preview.length < 1_500_000 && /^[A-Za-z0-9+/=]+$/.test(preview);
    const control = await loadControl(admin);
    if (control && !control.enabled) {
      // Monthly AI budget reached (or checks turned off by an admin): accept the photo without an AI check.
      await admin.from("ai_selfie_check_control").update({ skipped_this_month: control.skipped_this_month + 1 }).eq("id", 1);
    } else {
      const faceCheck = await verifyFace(usePreview ? preview : selfieBase64, usePreview ? "image/jpeg" : selfieContentType);
      if (faceCheck.status === "unavailable") {
        // AI check couldn't run: accept the photo rather than locking the visitor out.
        console.warn("selfie AI check unavailable; accepting without check");
      } else if (control) {
        await recordCheck(admin, control);
      }
      if (faceCheck.status === "rejected") {
        return json({ error: { selfie: faceCheck.reason || "Please upload a clear selfie showing your face." } }, 400);
      }
    }

    const extension = selfieContentType === "image/png" ? "png" : selfieContentType === "image/webp" ? "webp" : "jpg";
    const selfiePath = `${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await admin.storage
      .from("age-verification-selfies")
      .upload(selfiePath, selfieBytes, { contentType: selfieContentType, upsert: false });
    if (uploadError) throw uploadError;

    const { data, error } = await admin
      .from("age_gate_leads")
      .insert({
        full_name: fullName,
        username: usernameRaw || null,
        phone,
        date_of_birth: dateOfBirth,
        referral_code: referralCode,
        action_taken: "submitted",
        selfie_path: selfiePath,
      })
      .select("id")
      .single();

    if (error) {
      await admin.storage.from("age-verification-selfies").remove([selfiePath]);
      throw error;
    }

    return json({ success: true, leadId: data.id });
  } catch (err) {
    console.error("submit-age-gate-lead error:", err);
    return json({ error: "Failed to save submission" }, 500);
  }
});
