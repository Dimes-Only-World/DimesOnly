import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Copy, Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Section = { title: string; text: string };

const DEFAULT_SECTIONS: Section[] = [
  {
    title: "Greetings Males",
    text: "Hey! This is Dimes Only World. We're launching the app and building Money Circles right now. Men lock in a FREE 3-year Silver membership before launch, get profit-sharing positions, and earn referral commissions. Want the details?",
  },
  {
    title: "More Info",
    text: "Dimes Only World is a social + events platform where members earn from referrals, tips, events, and quarterly profit sharing. You get your own share link, and everyone who joins under you is tracked to your Money Circle. Register free here: https://DimesOnly.World",
  },
  {
    title: "How does it work?",
    text: "1) You register free and get your personal link.\n2) You share your link — every person who joins goes into your Money Circle.\n3) You earn 20% on your direct referrals' activity and 10% on their referrals.\n4) Plus members also qualify for profit-sharing positions and event perks.",
  },
  {
    title: "What is this?",
    text: "Dimes Only World is an entertainment and events network. Members attend and host events, share content, tip performers, and build an income stream through referrals and profit-sharing positions. It's free to join before app launch.",
  },
  {
    title: "Is this a pyramid scheme?",
    text: "No. There's nothing to buy to earn, and no one is required to recruit. Money comes from real activity on the platform — memberships, tips, event tickets, and merchant sales. Referral commissions are simply a marketing payout on real revenue, and paid upgrades are optional.",
  },
  {
    title: "How much money can I make?",
    text: "It depends on your activity. You earn 20% on direct referrals and 10% on their referrals, plus event and tip commissions. Profit-sharing positions pay quarterly up to $31,250 max, based on the company's net profits. There are no guarantees — your results depend on your effort.",
  },
  {
    title: "How do I get paid?",
    text: "Earnings accumulate in your dashboard under the Earnings tab. Once you have an available balance, you request a payout and it's processed on our semi-monthly pay schedule. Payouts go to the payment details on your profile.",
  },
  {
    title: "Is there a cost to join?",
    text: "No. Registration is free, and right now every new member gets a free 3-year membership (Silver for men, regular women and business owners; Diamond for Dimes). Paid upgrades like Silver Plus, Diamond Plus and Elite Plus are completely optional.",
  },
  {
    title: "Do I have to recruit people to make money?",
    text: "No. Referrals are one way to earn, but members also earn from tips, events, content and profit-sharing positions. Sharing your link just speeds things up.",
  },
  {
    title: "How long does it take to start earning?",
    text: "You can start earning as soon as your first referral joins and becomes active. Most earnings show in your dashboard within minutes of a qualifying transaction.",
  },
  {
    title: "What is a Money Circle?",
    text: "Your Money Circle is everyone connected to you — the people you personally referred plus the people they referred. It's shown right on your dashboard so you can see your network and the earnings it generates.",
  },
  {
    title: "Can I cancel anytime?",
    text: "Yes. Free memberships never bill you. Monthly plans can be cancelled at any time and you keep access through the end of your paid period. Notarized Elite Plus agreements are non-refundable per the terms shown at checkout.",
  },
  {
    title: "Who runs Dimes Only World?",
    text: "Dimes Only World is operated by its founding management team and event partners. Support is handled directly through the platform and this number — just reply here with any question.",
  },
  {
    title: "Greeting Business Owners",
    text: "Hey! Dimes Only World is opening 100 Elite Plus business owner positions. You start free as a Silver member, then can upgrade to Elite Plus for premium placement, event hosting, and the highest profit-sharing tier. Want me to send the breakdown?",
  },
  {
    title: "Greeting Regular Females",
    text: "Hi! Dimes Only World is launching and women can register free right now with a 3-year membership. You get event access, your own profile, and you earn referral commissions from everyone you bring in. Want the link?",
  },
  {
    title: "Greeting Stripper and Exxxotics",
    text: "Hey! Dimes Only World is signing performers before app launch. You get a FREE 3-year Diamond membership, your own tip page, event bookings, rankings, and the weekly jackpot. Register free: https://DimesOnly.World",
  },
  {
    title: "Did not complete registration?",
    text: "Hi! I saw you started signing up for Dimes Only World but didn't finish. It only takes a minute and your free 3-year membership is still available. Finish here: https://DimesOnly.World",
  },
];

const DEFAULT_TITLES = DEFAULT_SECTIONS.map((s) => s.title);

const STORAGE_KEY = "admin_sms_sections";
const LEGACY_KEY = "admin_sms_templates";

/** Merge saved sections with defaults: keep user edits, fill blanks, append missing sections. */
const mergeWithDefaults = (saved: Section[]): Section[] => {
  const result = saved.map((s) => {
    const match = DEFAULT_SECTIONS.find((d) => d.title === s.title);
    return match && !s.text?.trim() ? { ...s, text: match.text } : s;
  });
  DEFAULT_SECTIONS.forEach((d) => {
    if (!result.some((s) => s.title === d.title)) result.push({ ...d });
  });
  return result;
};

const loadSections = (): Section[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every((s) => typeof s?.title === "string")) {
        return mergeWithDefaults(parsed as Section[]);
      }
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (Array.isArray(parsed)) {
        return mergeWithDefaults(
          DEFAULT_TITLES.map((title, i) => ({ title, text: parsed[i] ?? "" })),
        );
      }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_SECTIONS.map((s) => ({ ...s }));
};

const AdminSMSTextTab: React.FC = () => {
  const [sections, setSections] = useState<Section[]>(loadSections);
  const [drafts, setDrafts] = useState<Section[]>(() => loadSections());
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [openItem, setOpenItem] = useState<string | undefined>(undefined);

  const persist = (next: Section[]) => {
    setSections(next);
    setDrafts(next.map((s) => ({ ...s })));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const updateDraft = (index: number, patch: Partial<Section>) => {
    setDrafts((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const saveSection = (index: number) => {
    const next = sections.map((s, i) => (i === index ? { ...s, ...drafts[index] } : s));
    persist(next);
    toast.success("Section saved");
  };

  const isDirty = (index: number) =>
    drafts[index]?.title !== sections[index]?.title ||
    drafts[index]?.text !== sections[index]?.text;

  // Persist the merged defaults on first load so new sections stick.
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sections));
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetToDefaults = () => {
    persist(DEFAULT_SECTIONS.map((s) => ({ ...s })));
    toast.success("Restored default sections");
  };

  const updateSection = (index: number, patch: Partial<Section>) => {
    const next = sections.map((s, i) => (i === index ? { ...s, ...patch } : s));
    persist(next);
  };

  const addSection = () => {
    const next = [...sections, { title: "New Section", text: "" }];
    persist(next);
    setOpenItem(`item-${next.length - 1}`);
  };

  const removeSection = (index: number) => {
    persist(sections.filter((_, i) => i !== index));
    setOpenItem(undefined);
  };

  const handleCopy = async (index: number) => {
    const text = sections[index]?.text || "";
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopiedIndex(index);
    toast.success("Copied!");
    setTimeout(() => setCopiedIndex((c) => (c === index ? null : c)), 2000);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>SMS Text Templates</CardTitle>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={resetToDefaults}>
            Reset to Defaults
          </Button>
          <Button type="button" size="sm" onClick={addSection}>
            <Plus className="w-4 h-4 mr-1" /> Add Section
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Add sections, rename their titles, and enter your message text. Use the copy button to
          paste into your texting app. Everything is saved in this browser.
        </p>

        <Accordion
          type="single"
          collapsible
          value={openItem}
          onValueChange={setOpenItem}
          className="w-full"
        >
          {sections.map((section, index) => (
            <AccordionItem key={`item-${index}`} value={`item-${index}`}>
              <AccordionTrigger className="text-left">
                {section.title || "Untitled Section"}
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={section.title}
                      onChange={(e) => updateSection(index, { title: e.target.value })}
                      placeholder="Section title"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSection(index)}
                      aria-label="Delete section"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  <Textarea
                    value={section.text}
                    onChange={(e) => updateSection(index, { text: e.target.value })}
                    placeholder="Enter your message text here…"
                    rows={6}
                    className="resize-y"
                  />
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(index)}
                      disabled={!section.text?.trim()}
                    >
                      {copiedIndex === index ? (
                        <>
                          <Check className="w-4 h-4 mr-1" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-1" /> Copy to Clipboard
                        </>
                      )}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {section.text?.length || 0} characters
                    </span>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default AdminSMSTextTab;
