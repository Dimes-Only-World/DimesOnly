import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, MessageSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { MESSAGE_AUDIENCES, messagesForAudience } from "@/lib/messageAudiences";

interface ShareMessage {
  id: string;
  title: string;
  body: string;
  sort_order: number;
  audience?: string | null;
}

interface MakeMoneyMessagesProps {
  username: string;
  fallbackBody: string;
}

const MakeMoneyMessages: React.FC<MakeMoneyMessagesProps> = ({ username, fallbackBody }) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ShareMessage[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [audience, setAudience] = useState<string>("normal_female");

  useEffect(() => {
    let mounted = true;
    supabase.functions.invoke("make-money", { body: { action: "listMessages" } }).then(({ data }) => {
      if (!mounted) return;
      setMessages(Array.isArray(data?.messages) ? data.messages : []);
      setActiveIndex(0);
    }).catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  const referralLink = useMemo(
    () => `www.DimesOnlyWorld.com?ref=${encodeURIComponent(username)}`,
    [username],
  );
  const filtered = messagesForAudience(messages, audience);
  const available = filtered.length > 0
    ? filtered
    : [{ id: "fallback", title: "Ready-to-Send Message", body: fallbackBody, sort_order: 0 }];
  const active = available[Math.min(activeIndex, available.length - 1)];
  const fullMessage = `${active && active.body.trim()}\n\n${referralLink}`;
  const move = (direction: number) => {
    setActiveIndex((current) => (current + direction + available.length) % available.length);
  };
  const copyMessage = async () => {
    await navigator.clipboard.writeText(fullMessage);
    toast({ title: "Message copied", description: "Your personal referral link is included." });
  };

  return (
    <Card className="border border-border">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5" /> {active?.title || "Ready-to-Send Message"}
          </CardTitle>
          {available.length > 1 && (
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" size="icon" onClick={() => move(-1)} aria-label="Previous message">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => move(1)} aria-label="Next message">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-foreground">Who are you sending to?</span>
          <select
            value={audience}
            onChange={(e) => { setAudience(e.target.value); setActiveIndex(0); }}
            className="w-full rounded-md border border-border bg-background p-2 text-sm text-foreground sm:w-64"
          >
            {MESSAGE_AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </label>
        <p className="text-sm text-muted-foreground">
          Copy this message and paste it into any app. Your personal referral link is added automatically.
        </p>
        <div className="min-h-44 rounded-md border border-border bg-muted p-4">
          <p className="whitespace-pre-line break-words text-sm text-foreground">{fullMessage}</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <Button onClick={copyMessage} className="w-full sm:w-auto">
            <Copy className="mr-2 h-4 w-4" /> Copy Message
          </Button>
          {available.length > 1 && (
            <span className="text-xs text-muted-foreground">{activeIndex + 1} of {available.length}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MakeMoneyMessages;