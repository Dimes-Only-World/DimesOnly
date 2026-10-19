import React, { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import CookieSettingsDialog from "@/components/CookieSettingsDialog";
import { hasDecided, isGpcOptOut, onConsentChanged, setConsent } from "@/lib/cookieConsent";
import { useToast } from "@/hooks/use-toast";

/**
 * First-visit cookie banner. Nothing beyond essential cookies runs until
 * the visitor accepts, rejects, or saves custom choices. Once decided,
 * the banner disappears and can be revisited via Cookie Settings in the footer.
 */
const CookieConsentBanner: React.FC = () => {
  const { toast } = useToast();
  const [visible, setVisible] = useState(false);
  const [gpc, setGpc] = useState(false);

  useEffect(() => {
    const sync = () => {
      setVisible(!hasDecided());
      setGpc(isGpcOptOut());
    };
    sync();
    return onConsentChanged(sync);
  }, []);

  if (!visible) return null;

  const accept = () => {
    const record = setConsent({ referralTracking: true, analytics: true, advertising: true });
    if (record.gpcOptOut) {
      toast({
        title: "Global Privacy Control honored",
        description: "Your browser asked us not to share data for advertising, so advertising cookies stay off.",
      });
    }
  };

  const reject = () => {
    setConsent({ referralTracking: true, analytics: false, advertising: false });
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[80] border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-lg"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:gap-4">
        <p className="flex min-w-0 flex-1 items-center gap-2 text-xs text-muted-foreground">
          <Cookie className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="break-words">
            We use essential cookies plus optional analytics and ads cookies.
            {gpc && <span className="text-primary"> Global Privacy Control detected — ads cookies stay off.</span>}
          </span>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" size="sm" onClick={accept} className="h-9 flex-1 touch-manipulation sm:flex-none">Accept</Button>
          <Button type="button" size="sm" variant="outline" onClick={reject} className="h-9 flex-1 touch-manipulation sm:flex-none">Reject</Button>
          <CookieSettingsDialog variant="banner" label="Customize" show="settings+policy" onSaved={() => setVisible(false)} />
        </div>
      </div>
    </div>
  );
};

export default CookieConsentBanner;
