import React, { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  getConsent,
  hasDecided,
  isGpcOptOut,
  onConsentChanged,
  setConsent,
  type CookieChoices,
} from "@/lib/cookieConsent";
import { COOKIES_EFFECTIVE_DATE, COOKIES_SECTIONS } from "@/lib/cookiePolicy";

type TriggerVariant = "link" | "outline" | "banner";

interface Props {
  variant?: TriggerVariant;
  label?: string;
  // "settings" shows only the toggles; "policy" shows the full policy text below the toggles.
  show?: "settings" | "settings+policy";
  onSaved?: () => void;
}

const CATEGORIES: { key: keyof Omit<CookieChoices, "essential">; title: string; description: string }[] = [
  {
    key: "referralTracking",
    title: "Referral tracking",
    description: "Records which referral link you came from, so referral and override earnings go to the right member.",
  },
  {
    key: "analytics",
    title: "Analytics (Google Analytics)",
    description: "Helps us understand which pages are popular and where errors happen, so we can improve the site.",
  },
  {
    key: "advertising",
    title: "Advertising",
    description: "Lets us and our advertising partners measure our ads and show you more relevant Dimes Only World ads elsewhere.",
  },
];

const CookieSettingsDialog: React.FC<Props> = ({ variant = "link", label = "Cookie Settings", show = "settings", onSaved }) => {
  const [open, setOpen] = useState(false);
  const [choices, setChoices] = useState<Omit<CookieChoices, "essential">>({
    referralTracking: true,
    analytics: false,
    advertising: false,
  });
  const [gpc, setGpc] = useState(false);

  useEffect(() => {
    if (!open) return;
    const record = getConsent();
    setGpc(isGpcOptOut());
    setChoices(
      record
        ? {
            referralTracking: record.choices.referralTracking,
            analytics: record.choices.analytics,
            advertising: record.choices.advertising,
          }
        : { referralTracking: true, analytics: false, advertising: false }
    );
  }, [open]);

  useEffect(() => onConsentChanged(() => setGpc(isGpcOptOut())), []);

  const save = () => {
    setConsent(choices);
    setOpen(false);
    onSaved?.();
  };

  const trigger =
    variant === "link" ? (
      <button type="button" onClick={() => setOpen(true)} className="text-blue-400 underline cursor-pointer hover:text-blue-300">
        {label}
      </button>
    ) : (
      <Button
        type="button"
        variant={variant === "banner" ? "ghost" : "outline"}
        size="sm"
        onClick={() => setOpen(true)}
        className="min-h-12 touch-manipulation"
      >
        <Cookie className="w-4 h-4" />
        {label}
      </Button>
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">Cookie Settings</DialogTitle>
          <DialogDescription>
            Choose which cookies we may use. Essential cookies are always on — the site can't work without them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3 rounded-md border p-3 opacity-70">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Essential</p>
              <p className="text-sm text-muted-foreground break-words">
                Sign-in, security, fraud prevention, payments, and basic settings. Always on.
              </p>
            </div>
            <Switch checked disabled aria-label="Essential cookies (always on)" />
          </div>

          {CATEGORIES.map((cat) => (
            <div key={cat.key} className="flex items-start justify-between gap-3 rounded-md border p-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground break-words">{cat.title}</p>
                <p className="text-sm text-muted-foreground break-words">{cat.description}</p>
                {cat.key === "advertising" && gpc && (
                  <p className="mt-1 text-xs text-primary break-words">
                    Global Privacy Control detected — advertising is turned off automatically.
                  </p>
                )}
              </div>
              <Switch
                checked={choices[cat.key]}
                onCheckedChange={(v) => setChoices((c) => ({ ...c, [cat.key]: v }))}
                aria-label={`${cat.title} cookies`}
                className="shrink-0"
              />
            </div>
          ))}
        </div>

        <Button type="button" onClick={save} className="w-full min-h-12 touch-manipulation">
          Save my choices
        </Button>

        {show === "settings+policy" && (
          <ScrollArea className="h-[35vh] w-full rounded-md border p-4">
            <p className="text-xs text-muted-foreground">Effective Date: {COOKIES_EFFECTIVE_DATE}</p>
            <div className="mt-3 space-y-4">
              {COOKIES_SECTIONS.map((section) => (
                <section key={section.heading}>
                  <h4 className="font-semibold text-foreground pt-1">{section.heading}</h4>
                  <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">
                    {section.lines.map((line, i) => (
                      <p key={i} className="break-words">{line}</p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CookieSettingsDialog;
export { hasDecided };
