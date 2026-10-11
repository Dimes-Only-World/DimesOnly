import { useEffect } from "react";
import { useLocation } from "@/lib/router-compat";
import { captureRefFromUrl } from "@/lib/refCapture";
import { applyConsent, getConsent, hasDecided, onConsentChanged } from "@/lib/cookieConsent";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const GARefTracker: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    // Remember the referral username on any page, so it survives browsing
    // and is still available when the visitor signs up or subscribes.
    captureRefFromUrl();

    // Apply any consent saved earlier in this browser (e.g. a previous visit).
    applyConsent(hasDecided() ? getConsent() : null);

    // Analytics events only fire once the visitor accepted analytics cookies.
    // When consent is granted later, this effect re-runs so the current
    // page's referral visit is still counted.
    const record = hasDecided() ? getConsent() : null;
    if (record?.choices.analytics) {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref && typeof window.gtag === "function") {
        window.gtag("event", "referral_visit", {
          ref_username: ref,
          page_path: location.pathname,
        });
      }
    }

    return onConsentChanged(() => {
      const latest = getConsent();
      if (latest?.choices.analytics) {
        const params = new URLSearchParams(window.location.search);
        const ref = params.get("ref");
        if (ref && typeof window.gtag === "function") {
          window.gtag("event", "referral_visit", {
            ref_username: ref,
            page_path: window.location.pathname,
          });
        }
      }
    });
  }, [location.pathname, location.search]);

  return null;
};

export default GARefTracker;
