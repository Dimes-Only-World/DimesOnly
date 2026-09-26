import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, Sparkles, Loader2 } from "lucide-react";

interface Share { id: string; flyer_title: string; channel: string; shared_at: string }
const LABELS: Record<string, string> = {
  share: "Share", contacts: "Phone contacts", facebook: "Facebook", instagram: "Instagram",
  whatsapp: "WhatsApp", telegram: "Telegram", x: "X", copy: "Copied link",
};

export const FLYER_SHARED_EVENT = "dimes-flyer-shared";

export async function logFlyerShare(flyerId: string, flyerTitle: string, channel: string) {
  try {
    await supabase.functions.invoke("flyer-insights", { body: { action: "logShare", flyerId, flyerTitle, channel } });
    window.dispatchEvent(new Event(FLYER_SHARED_EVENT));
  } catch { /* never block sharing */ }
}

const FlyerShareHistory: React.FC<{ flyers: { id: string; title: string }[] }> = ({ flyers }) => {
  const [shares, setShares] = useState<Share[]>([]);
  const [filter, setFilter] = useState<"contacts" | "all">("contacts");
  const [summary, setSummary] = useState("");
  const [aiError, setAiError] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.functions.invoke("flyer-insights", { body: { action: "listShares" } });
    setShares(data?.shares || []);
  }, []);

  useEffect(() => {
    load();
    window.addEventListener(FLYER_SHARED_EVENT, load);
    return () => window.removeEventListener(FLYER_SHARED_EVENT, load);
  }, [load]);

  const runAi = async () => {
    setLoadingAi(true); setAiError(""); setSummary("");
    const { data, error } = await supabase.functions.invoke("flyer-insights", { body: { action: "summarize", flyers } });
    let msg = data?.error as string | undefined;
    if (error && !msg) {
      try { msg = (await (error as any).context?.json())?.error; } catch { /* ignore */ }
    }
    if (data?.summary) setSummary(data.summary);
    else setAiError(msg || "Couldn't create suggestions right now.");
    setLoadingAi(false);
  };

  const list = filter === "contacts" ? shares.filter((s) => s.channel === "contacts") : shares;

  return (
    <Card className="border border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><History className="w-5 h-5" /> Flier Share History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button size="sm" variant={filter === "contacts" ? "default" : "outline"} onClick={() => setFilter("contacts")}>Phone contacts</Button>
          <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>All shares</Button>
        </div>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">No shares yet. Use the buttons under a flier to share it.</p>
        ) : (
          <ul className="max-h-64 overflow-y-auto divide-y divide-border rounded-md border border-border">
            {list.slice(0, 100).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="truncate font-medium">{s.flyer_title || "Flier"}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {LABELS[s.channel] || s.channel} · {new Date(s.shared_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="rounded-md border border-border p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="w-4 h-4" /> AI sharing tips</p>
            <Button size="sm" onClick={runAi} disabled={loadingAi}>
              {loadingAi ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Thinking…</> : "What should I share next?"}
            </Button>
          </div>
          {aiError && <p className="text-sm text-destructive">{aiError}</p>}
          {summary && <p className="whitespace-pre-line text-sm text-foreground">{summary}</p>}
        </div>
      </CardContent>
    </Card>
  );
};

export default FlyerShareHistory;
