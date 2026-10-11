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

  // Reserve room at the page bottom so the banner never covers footer links.
  const bannerRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = bannerRef.current;
    if (!visible || !el) return;
    const apply = () => { document.body.style.paddingBottom = `${el.offsetHeight}px`; };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => { ro.disconnect(); document.body.style.paddingBottom = ""; };
  }, [visible]);

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
      ref={bannerRef}
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[80] border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-[0_-8px_24px_rgba(0,0,0,0.4)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto max-w-3xl px-4 py-4 space-y-3">
        <div className="flex items-start gap-3 min-w-0">
          <Cookie className="w-5 h-5 shrink-0 mt-0.5 text-primary" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Cookies, and your choice</p>
            <p className="text-sm text-muted-foreground break-words">
              We use essential cookies to keep the site working, plus optional analytics and advertising cookies.
              You can accept everything, keep only the essentials, or pick exactly what's allowed.{" "}
              {gpc && (
                <span className="text-primary">
                  Global Privacy Control detected — advertising cookies will stay off.
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Button type="button" onClick={accept} className="min-h-12 touch-manipulation w-full sm:w-auto">
            Accept all
          </Button>
          <Button type="button" variant="outline" onClick={reject} className="min-h-12 touch-manipulation w-full sm:w-auto">
            Reject optional
          </Button>
          <CookieSettingsDialog
            variant="banner"
            label="Customize"
            show="settings+policy"
            onSaved={() => setVisible(false)}
          />
        </div>
      </div>
    </div>
  );
};

export default CookieConsentBanner;
