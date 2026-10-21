import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// The only places the AI search may link to.
const AREAS: [string, string][] = [
  ["/dashboard/profile", "Your profile dashboard"],
  ["/dashboard/profile-info", "Edit profile info, photos, bio"],
  ["/dashboard/make-money", "Make Money: referral link, flyers, ready-to-send messages"],
  ["/dashboard/notifications", "Your notifications"],
  ["/dashboard/earnings", "Earnings, balance, payout requests"],
  ["/dashboard/messages", "Direct messages"],
  ["/dashboard/media", "Upload and manage photos/videos"],
  ["/dashboard/jackpot", "Jackpot tickets and draws"],
  ["/dashboard/referrals", "Your referrals"],
  ["/money-circle", "Money Circle referral network"],
  ["/rankings", "Top 20 rankings"],
  ["/tip-girls", "Tip & Win: tip Dimes, earn jackpot tickets"],
  ["/rate-girls", "Rate Dimes"],
  ["/dimes", "Browse Dimes"],
  ["/events", "Events and tickets"],
  ["/rentals", "Car rentals, buy a car, credit application"],
  ["/rentals/host", "Become a rental host"],
  ["/account/my-rentals", "My rentals"],
  ["/account/my-purchases", "My vehicle purchase applications"],
  ["/clothes", "Clothing store"],
  ["/flix", "FlameFlix movie streaming"],
  ["/memberships", "Membership plans and upgrades"],
  ["/terms", "Terms and conditions"],
  ["/privacy", "Privacy policy"],
];

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["answer", "links"],
  properties: {
    answer: { type: "string" },
    links: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["path", "label"],
        properties: { path: { type: "string" }, label: { type: "string" } },
      },
    },
  },
};

export type SiteSearchResult = { answer: string; links: { path: string; label: string }[]; error?: string };

export const siteSearch = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ query: z.string(), usernames: z.array(z.string()).optional() }).parse(d),
  )
  .handler(async ({ data }): Promise<SiteSearchResult> => {
    const query = data.query.trim().slice(0, 300);
    const users = (data.usernames || []).slice(0, 5).map((u) => u.slice(0, 40).replace(/[^\w.-]/g, ""));
    if (!query) return { answer: "", links: [], error: "Type something to search." };
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { answer: "", links: [], error: "AI search is not configured." };

    const prompt = `You are the search assistant for Dimes Only World, a members site with memberships, referrals, tipping, rating, events, car rentals, a clothing store and FlameFlix streaming.
A member searched: "${query}"
Explain briefly (under 90 words, plain friendly English) what they can do and where to go.
Only link to paths from this list (path — what it is):
${AREAS.map(([p, d]) => `${p} — ${d}`).join("\n")}
${users.length ? `Matching members (link as /profile/USERNAME): ${users.join(", ")}` : ""}
Return 1-4 most relevant links with short labels. If nothing fits, say so kindly and return an empty list.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra", input: prompt, stream: true, store: false,
        reasoning: { effort: "low", summary: "auto" }, include: ["reasoning.encrypted_content"],
        text: { format: { type: "json_schema", name: "search_result", strict: true, schema } },
      }),
    });
    if (!res.ok || !res.body) {
      console.error("site-search", res.status, await res.text().catch(() => ""));
      let error = "Search is unavailable right now.";
      if (res.status === 429) error = "Too many searches right now — try again in a minute.";
      if (res.status === 402) error = "AI credits have run out. Please contact support.";
      return { answer: "", links: [], error };
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        try {
          const ev = JSON.parse(line.slice(5).trim());
          if (ev.type === "response.output_text.delta") text += ev.delta || "";
        } catch { /* partial */ }
      }
    }
    let parsed: { answer: string; links: { path: string; label: string }[] };
    try { parsed = JSON.parse(text); } catch { return { answer: "", links: [], error: "Search returned no answer." }; }
    const allowed = new Set([...AREAS.map(([p]) => p), ...users.map((u) => `/profile/${u}`)]);
    return { answer: parsed.answer || "", links: (parsed.links || []).filter((l) => allowed.has(l.path)).slice(0, 4) };
  });
