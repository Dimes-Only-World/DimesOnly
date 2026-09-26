import { createClient } from "npm:@supabase/supabase-js@2";
import { AUTH_HEADERS, getCallerId } from "../_shared/caller.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": AUTH_HEADERS,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, ...extra, "Content-Type": "application/json" } });

const CHANNELS = ["share", "contacts", "facebook", "instagram", "whatsapp", "telegram", "x", "copy"];
const MODEL = "openai/gpt-6-astra";

async function summarize(req: Request, flyers: { id: string; title: string }[], shares: any[]) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "AI is not configured." }, 500);

  const prompt = `You help a member of a referral network decide which promotional fliers to share.
Available fliers (id: title):
${flyers.map((f) => `- ${f.id}: ${f.title}`).join("\n") || "(none listed)"}

Their share history (newest first, up to 300): flier title | channel | ISO time
${shares.map((s) => `${s.flyer_title} | ${s.channel} | ${s.shared_at}`).join("\n") || "(no shares yet)"}

Write a short, friendly report in plain English (under 180 words) with three headed parts:
1. "Your pattern" — which fliers, channels, days and times they share most.
2. "Share next" — the 1–3 fliers to share next and why (favor fliers shared less or not recently).
3. "Tip" — one practical suggestion about channel or timing.
No markdown tables.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    signal: req.signal,
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: MODEL, input: prompt, stream: true, store: false,
      reasoning: { effort: "low", summary: "auto" }, include: ["reasoning.encrypted_content"],
    }),
  });
  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => "");
    let msg = "The AI couldn't create a summary right now.";
    try { msg = JSON.parse(t)?.error?.message || JSON.parse(t)?.message || msg; } catch { /* keep */ }
    if (res.status === 429) msg = "Too many requests right now — please try again in a minute.";
    if (res.status === 402) msg = "AI credits have run out. Please contact support.";
    const status = [402, 403, 429].includes(res.status) ? res.status : 502;
    return json({ error: msg }, status);
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", text = "", failed = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const ev = JSON.parse(data);
        if (ev.type === "response.output_text.delta") text += ev.delta || "";
        if (ev.type === "response.failed" || ev.type === "error") failed = ev?.response?.error?.message || ev?.message || "failed";
      } catch { /* partial */ }
    }
  }
  if (!text.trim()) return json({ error: failed ? "The AI couldn't create a summary right now." : "The AI returned no summary." }, 502);
  return json({ summary: text.trim() });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const userId = await getCallerId(req);
    if (!userId) return json({ error: "Please sign in." }, 401);
    const body = await req.json().catch(() => ({}));
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (body.action === "logShare") {
      const flyerId = String(body.flyerId || "").slice(0, 100);
      const title = String(body.flyerTitle || "").slice(0, 200);
      const channel = String(body.channel || "").toLowerCase();
      if (!flyerId || !CHANNELS.includes(channel)) return json({ error: "Invalid share" }, 400);
      const { error } = await admin.from("flyer_shares").insert({ user_id: userId, flyer_id: flyerId, flyer_title: title, channel });
      if (error) throw error;
      return json({ ok: true });
    }

    if (body.action === "listShares") {
      const { data, error } = await admin.from("flyer_shares")
        .select("id, flyer_id, flyer_title, channel, shared_at")
        .eq("user_id", userId).order("shared_at", { ascending: false }).limit(300);
      if (error) throw error;
      return json({ shares: data || [] });
    }

    if (body.action === "summarize") {
      const flyers = Array.isArray(body.flyers)
        ? body.flyers.slice(0, 50).map((f: any) => ({ id: String(f?.id || "").slice(0, 100), title: String(f?.title || "").slice(0, 200) }))
        : [];
      const { data } = await admin.from("flyer_shares")
        .select("flyer_title, channel, shared_at")
        .eq("user_id", userId).order("shared_at", { ascending: false }).limit(300);
      return await summarize(req, flyers, data || []);
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("flyer-insights", e);
    return json({ error: "Something went wrong." }, 500);
  }
});
